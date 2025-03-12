/**
 * This file contains the actual implementation for the Netlify function.
 * It's loaded dynamically by index.js to keep the initial function size small.
 */

// Helper function to load modules on demand
const loadModule = async (modulePath) => {
  try {
    return await import(modulePath);
  } catch (error) {
    console.error(`Failed to load module: ${modulePath}`, error);
    return null;
  }
};

// The actual handler implementation
exports.handler = async (event, context) => {
  console.log("Implementation handler called with path:", event.path);
  
  // Parse the path to determine what functionality to load
  const path = event.path.replace(/^\/\.netlify\/functions\/[^\/]+/, '');
  
  try {
    // Handle different API paths - this is where we would route to different Next.js API endpoints
    if (path.startsWith('/api/analyze')) {
      const analyzeModule = await loadModule('../../app/api/analyze/route.js');
      if (analyzeModule) {
        return await analyzeModule.default(event, context);
      }
    } 
    else if (path.startsWith('/api/upload')) {
      const uploadModule = await loadModule('../../app/api/upload/route.js');
      if (uploadModule) {
        return await uploadModule.default(event, context);
      }
    }
    
    // Default response for unhandled paths
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Netlify function is running',
        path: path,
        event: {
          httpMethod: event.httpMethod,
          headers: event.headers,
          queryStringParameters: event.queryStringParameters
        }
      })
    };
  } catch (error) {
    console.error("Error in implementation handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Error in function implementation",
        message: error.message
      }),
    };
  }
}; 