/**
 * This script runs after the build to ensure Netlify functions remain under the size limit.
 * It creates minimal proxies for the actual implementations.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rm = promisify(fs.rm);
const mkdir = promisify(fs.mkdir);

// Key directories to check
const DIRECTORIES = [
  '.netlify/functions',
  'netlify/functions',
  '.next/server/pages/api',
  '.next/server/app/api'
];

// File extensions to clean up
const EXTENSIONS_TO_CLEAN = [
  '.map', '.d.ts', '.md', '.ts', '.flow', '.txt', '.LICENSE.txt'
];

// Ensures a directory exists
async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating directory ${dir}:`, err);
    }
  }
}

// Get size of a file or directory
async function getSize(path) {
  try {
    const stats = await stat(path);
    if (stats.isDirectory()) {
      let totalSize = 0;
      const files = await readdir(path);
      for (const file of files) {
        const filePath = `${path}/${file}`;
        totalSize += await getSize(filePath);
      }
      return totalSize;
    } else {
      return stats.size;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error getting size of ${path}:`, err);
    }
    return 0;
  }
}

// Format size for display
function formatSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`;
}

// Clean up unnecessary files from a directory
async function cleanDirectory(dir) {
  try {
    console.log(`🧹 Cleaning directory: ${dir}`);
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = `${dir}/${file}`;
      try {
        const stats = await stat(filePath);
        
        if (stats.isDirectory()) {
          // Skip node_modules to prevent breaking dependencies
          if (file === 'node_modules') continue;
          await cleanDirectory(filePath);
        } else {
          // Remove files with unwanted extensions
          if (EXTENSIONS_TO_CLEAN.some(ext => file.endsWith(ext))) {
            console.log(`🗑️ Removing unnecessary file: ${filePath}`);
            await rm(filePath);
          }
          // Check if JS file is too large
          else if (file.endsWith('.js') && stats.size > 5 * 1024 * 1024) {
            console.log(`⚠️ Large JS file detected: ${filePath} (${formatSize(stats.size)})`);
          }
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error processing ${filePath}:`, err);
        }
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error cleaning directory ${dir}:`, err);
    }
  }
}

// Create minimal function proxies for specific files
async function createMinimalProxies() {
  // Ensure the functions directories exist
  await ensureDir('.netlify/functions');
  await ensureDir('netlify/functions');
  
  // Create minimal index.js
  const indexContent = `
// Minimal index function handler to stay under size limits
exports.handler = async (event, context) => {
  try {
    // Dynamically load only what we need based on the path
    const path = event.path || '';
    console.log("Function called with path:", path);
    
    // Simple routing based on path - each path loads separate code
    if (path.includes('/api/analyze')) {
      const module = await import('./analyze-handler.js');
      return module.default(event, context);
    } 
    else if (path.includes('/api/upload')) {
      const module = await import('./upload-handler.js');
      return module.default(event, context);
    }
    
    // Default response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Function is running' })
    };
  } catch (error) {
    console.error("Error in function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" })
    };
  }
};`;

  // Create minimal config.js
  const configContent = `
// Minimal configuration
module.exports = {
  externalModules: ['*']
};`;

  // Write the minimal files
  fs.writeFileSync('.netlify/functions/index.js', indexContent);
  fs.writeFileSync('.netlify/functions/config.js', configContent);
  
  console.log('✅ Created minimal proxy files in .netlify/functions/');
}

// Main function
async function main() {
  console.log('🚀 Starting function optimization...');
  
  // Check sizes before optimization
  for (const dir of DIRECTORIES) {
    const size = await getSize(dir);
    console.log(`📊 Initial size of ${dir}: ${formatSize(size)}`);
  }
  
  // Clean directories
  for (const dir of DIRECTORIES) {
    await cleanDirectory(dir);
  }
  
  // Create minimal function proxies
  await createMinimalProxies();
  
  // Check sizes after optimization
  for (const dir of DIRECTORIES) {
    const size = await getSize(dir);
    console.log(`📊 Final size of ${dir}: ${formatSize(size)}`);
    
    if (size > 250 * 1024 * 1024) {
      console.warn(`⚠️ Warning: ${dir} is still larger than Netlify's limit!`);
    } else {
      console.log(`✅ ${dir} is within Netlify's size limit.`);
    }
  }
  
  console.log('✨ Function optimization complete!');
}

// Run the script
main().catch(err => {
  console.error('Error in optimization script:', err);
  process.exit(1);
}); 