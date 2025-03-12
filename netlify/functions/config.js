/**
 * Minimal configuration file for Netlify functions.
 * This file is kept as small as possible to stay under size limits.
 */

// Export only the essential configuration
module.exports = {
  // List of modules that should be externalized and not bundled
  externalModules: [
    // Core dependencies
    'next', 'react', 'react-dom',
    
    // Document processing libraries
    'mammoth', 'pdf-parse',
    
    // UI component libraries
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-tabs',
    '@radix-ui/react-tooltip',
    'framer-motion',
    
    // Utility libraries
    'date-fns',
    'zod'
  ],
  
  // Dynamic import helper - minimal version
  dynamicImport: async (moduleName) => {
    try {
      return await import(moduleName);
    } catch (error) {
      console.error(`Error importing ${moduleName}:`, error);
      return null;
    }
  }
}; 