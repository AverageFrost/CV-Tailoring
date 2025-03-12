/**
 * This script runs after the build to optimize the Netlify function size
 * by removing unnecessary files and dependencies that are too large.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rm = promisify(fs.rm);

// Directories that contain generated Netlify functions
const FUNCTION_DIRECTORIES = [
  '.next/standalone/.netlify/functions',
  '.netlify/functions',
  '.next/server/pages',
  '.next/server/app',
  '.next/standalone/node_modules'
];

// Node modules that should be removed from bundled functions
const MODULES_TO_REMOVE = [
  // Development dependencies
  'typescript', '@types', '@babel', 'eslint', 'prettier',
  
  // Large packages that are externalized
  'puppeteer', 'chrome-aws-lambda', 'playwright', '@swc', 'esbuild',
  '@next/swc-', 'next/dist/compiled', '.next/cache',
  
  // Large UI libraries that shouldn't be in the server bundle
  'react-dom/server', '@radix-ui', 'framer-motion', 'lucide-react',
  
  // Test and docs directories
  'test', 'tests', '__tests__', '__mocks__', 'docs', 'examples',
  
  // Source files when we only need the dist
  'src', '.github', '.vscode',
  
  // Build artifacts and cache
  '.turbo', '.next/cache'
];

// File extensions to remove from function bundles
const FILE_EXTENSIONS_TO_REMOVE = [
  '.map', // Source maps
  '.md', // Documentation
  '.d.ts', // TypeScript declaration files
  '.flow', // Flow type definitions
  '.txt', // Text files
  '.gz', // Compressed files
  '.tsbuildinfo', // TypeScript build info
  '.woff', '.woff2', '.ttf', '.eot', // Fonts
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', // Images
  '.min.js.LICENSE.txt', // License files
  '.test.js', '.spec.js', // Test files
];

async function getSize(dir) {
  try {
    const stats = await stat(dir);
    
    if (!stats.isDirectory()) {
      return stats.size;
    }
    
    const files = await readdir(dir);
    const sizes = await Promise.all(
      files.map(async file => {
        const filePath = path.join(dir, file);
        try {
          return await getSize(filePath);
        } catch (e) {
          console.error(`Error getting size of ${filePath}:`, e.message);
          return 0;
        }
      })
    );
    
    return sizes.reduce((acc, size) => acc + size, 0);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return 0;
    }
    throw e;
  }
}

async function formatSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`;
}

async function removeFiles(dir, patterns) {
  try {
    const files = await readdir(dir);
    
    await Promise.all(files.map(async file => {
      const filePath = path.join(dir, file);
      try {
        const stats = await stat(filePath);
        
        if (stats.isDirectory()) {
          // Check if the directory name matches any pattern to remove
          if (patterns.some(pattern => {
            if (pattern.startsWith('*')) {
              // Pattern like *test* should match anywhere in the path
              return file.includes(pattern.slice(1, -1));
            } else if (pattern.endsWith('*')) {
              // Pattern like react* should match the beginning
              const prefix = pattern.slice(0, -1);
              return file.startsWith(prefix);
            } else if (pattern.startsWith('.')) {
              // Pattern like .next/cache should match exactly
              return filePath.includes(pattern);
            }
            return file === pattern;
          })) {
            console.log(`🗑️  Removing directory: ${filePath}`);
            await rm(filePath, { recursive: true, force: true });
          } else {
            // Recursively process subdirectories
            await removeFiles(filePath, patterns);
          }
        } else {
          // Check if the file matches any extension to remove
          if (FILE_EXTENSIONS_TO_REMOVE.some(ext => file.endsWith(ext))) {
            console.log(`🗑️  Removing file: ${filePath}`);
            await rm(filePath, { force: true });
          }
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error processing ${filePath}:`, err);
        }
      }
    }));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error cleaning up ${dir}:`, err);
    }
  }
}

async function optimizeNodeModules() {
  // Specific paths to check for excessive node_modules
  const nodeModulesPaths = [
    '.next/standalone/node_modules',
    '.netlify/functions/node_modules'
  ];

  for (const nodeModulesPath of nodeModulesPaths) {
    if (!fs.existsSync(nodeModulesPath)) {
      continue;
    }

    console.log(`🔍 Optimizing node_modules in ${nodeModulesPath}...`);

    try {
      // Remove development-only directories from node_modules
      const modules = await readdir(nodeModulesPath);
      
      for (const moduleName of modules) {
        const modulePath = path.join(nodeModulesPath, moduleName);
        const stats = await stat(modulePath);
        
        if (!stats.isDirectory()) continue;
        
        if (MODULES_TO_REMOVE.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(moduleName);
          }
          return moduleName === pattern || moduleName.startsWith(pattern);
        })) {
          console.log(`🗑️  Removing module: ${modulePath}`);
          await rm(modulePath, { recursive: true, force: true });
        } else {
          // For retained modules, remove unnecessary files
          await removeFiles(modulePath, ['test', 'tests', '__tests__', '.github', 'docs', 'examples']);
        }
      }
    } catch (err) {
      console.error(`Error optimizing ${nodeModulesPath}:`, err);
    }
  }
}

async function cleanServerFiles() {
  // Clean specifically the index.js and config.js files mentioned in the error
  const serverFilesToCheck = [
    '.netlify/functions/index.js',
    '.netlify/functions/config.js'
  ];
  
  for (const file of serverFilesToCheck) {
    if (fs.existsSync(file)) {
      try {
        const fileStats = await stat(file);
        const fileSizeMB = fileStats.size / (1024 * 1024);
        
        console.log(`📄 Server file ${file} size: ${fileSizeMB.toFixed(2)} MB`);
        
        if (fileSizeMB > 10) {
          console.log(`⚠️ Server file ${file} is very large, checking for optimization opportunities...`);
          
          // If it's large, we'll try to see if we can create a minimized version
          try {
            // Read file and check if it contains requires for large libraries
            const content = fs.readFileSync(file, 'utf8');
            const modifiedContent = content
              // Remove source maps
              .replace(/\/\/# sourceMappingURL=.+/g, '')
              // Add externalization for large modules
              .replace(/require\(['"](.+?)['"]\)/g, (match, module) => {
                if (['mammoth', 'pdf-parse', 'react', 'react-dom', 'next', 'sharp'].includes(module)) {
                  return `(() => { 
                    try { 
                      return require('${module}'); 
                    } catch (error) { 
                      console.error('Error loading external module ${module}:', error); 
                      return {}; 
                    } 
                  })()`;
                }
                return match;
              });
            
            // Only write if we actually changed something
            if (content !== modifiedContent) {
              fs.writeFileSync(file, modifiedContent);
              console.log(`✅ Optimized ${file}`);
            }
          } catch (err) {
            console.error(`Error optimizing ${file}:`, err);
          }
        }
      } catch (err) {
        console.error(`Error checking ${file}:`, err);
      }
    }
  }
}

async function main() {
  console.log('🧹 Starting Netlify functions optimization...');

  // Check function sizes before optimization
  for (const dir of FUNCTION_DIRECTORIES) {
    if (fs.existsSync(dir)) {
      const size = await getSize(dir);
      console.log(`📊 Initial size of ${dir}: ${await formatSize(size)}`);
    }
  }

  // Remove unnecessary modules and files
  console.log('🗑️  Removing unnecessary modules and files...');
  
  // First optimize node_modules
  await optimizeNodeModules();
  
  // Then clean up specific patterns in function directories
  for (const dir of FUNCTION_DIRECTORIES) {
    if (fs.existsSync(dir)) {
      await removeFiles(dir, MODULES_TO_REMOVE);
    }
  }
  
  // Clean server files that were specifically mentioned in the error
  await cleanServerFiles();

  // Check function sizes after optimization
  for (const dir of FUNCTION_DIRECTORIES) {
    if (fs.existsSync(dir)) {
      const size = await getSize(dir);
      console.log(`📊 Final size of ${dir}: ${await formatSize(size)}`);
      
      if (size > 250 * 1024 * 1024) {
        console.warn(`⚠️  Warning: ${dir} is still larger than Netlify's 250MB limit!`);
      } else {
        console.log(`✅ ${dir} is within Netlify's 250MB limit.`);
      }
    }
  }

  console.log('✨ Optimization complete!');
}

main().catch(err => {
  console.error('Error optimizing functions:', err);
  process.exit(1);
}); 