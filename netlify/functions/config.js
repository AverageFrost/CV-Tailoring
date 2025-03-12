// Configuration for Netlify functions
module.exports = {
  // These modules will be marked as externals and not bundled
  externalModules: [
    'mammoth',
    'pdf-parse',
    '@next/font',
    'next',
    'react',
    'react-dom',
    'sharp'
  ],
  // Helper function to dynamically import externalized modules
  dynamicImport: async (moduleName) => {
    try {
      return await import(moduleName);
    } catch (error) {
      console.error(`Error importing ${moduleName}:`, error);
      return null;
    }
  }
}; 