// This file is a placeholder to ensure the netlify/functions directory is included in the build
// It helps with Next.js API routes being properly bundled for Netlify Functions

// Re-export utility modules to make them available to Netlify functions
exports.loadNetlifyUtils = () => {
  try {
    return require('../../lib/netlifyUtils');
  } catch (e) {
    console.error('Error loading netlifyUtils from lib:', e);
    try {
      return require('../../app/api/utils/netlifyUtils');
    } catch (e2) {
      console.error('Error loading netlifyUtils from app/api/utils:', e2);
      return null;
    }
  }
};

// Export a dummy handler for direct invocation
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'This is a utility function module' })
  };
}; 