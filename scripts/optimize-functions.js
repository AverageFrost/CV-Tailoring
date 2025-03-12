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
  '.next/server/app'
];

// Node modules that should be removed from bundled functions
const MODULES_TO_REMOVE = [
  '.next/standalone/node_modules/puppeteer',
  '.next/standalone/node_modules/chrome-aws-lambda',
  '.next/standalone/node_modules/playwright',
  '.next/standalone/node_modules/@swc',
  '.next/standalone/node_modules/esbuild',
  '.next/standalone/node_modules/typescript',
  '.next/standalone/node_modules/@next/swc-*',
  '.next/cache',
];

// File extensions to remove from function bundles
const FILE_EXTENSIONS_TO_REMOVE = [
  '.map', // Source maps
  '.md', // Documentation
  '.d.ts', // TypeScript declaration files
];

async function getSize(dir) {
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
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        // Check if the directory matches any pattern
        if (patterns.some(pattern => {
          if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            return filePath.startsWith(prefix);
          }
          return filePath === pattern;
        })) {
          console.log(`🗑️  Removing directory: ${filePath}`);
          await rm(filePath, { recursive: true, force: true });
        } else {
          await removeFiles(filePath, patterns);
        }
      } else {
        // Check if the file matches any extension to remove
        if (FILE_EXTENSIONS_TO_REMOVE.some(ext => file.endsWith(ext))) {
          console.log(`🗑️  Removing file: ${filePath}`);
          await rm(filePath, { force: true });
        }
      }
    }));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error cleaning up ${dir}:`, err);
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
  for (const pattern of MODULES_TO_REMOVE) {
    const dirToCheck = pattern.split('*')[0]; // Get the directory part before any wildcard
    if (fs.existsSync(dirToCheck)) {
      await removeFiles(path.dirname(dirToCheck), [pattern]);
    }
  }

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