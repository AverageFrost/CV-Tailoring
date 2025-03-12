/**
 * Minimal Netlify Function Entry Point
 * This file is designed to be as small as possible to stay under size limits.
 * All actual functionality is implemented in separate modules.
 */

// Export a handler that will dynamically load the actual implementation
exports.handler = async (event, context) => {
  try {
    console.log("Function invoked with method:", event.httpMethod, "and path:", event.path);
    
    // Load the actual implementation only when needed
    // Using dynamic import to avoid bundling everything upfront
    const implementation = await import('./implementation.js')
      .catch(error => {
        console.error("Error loading implementation:", error);
        return { 
          handler: () => ({ 
            statusCode: 500, 
            body: JSON.stringify({ error: "Internal server error - failed to load implementation" }) 
          })
        };
      });

    // Call the actual implementation
    return implementation.handler(event, context);
  } catch (error) {
    console.error("Error in function handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}; 