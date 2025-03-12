import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Collect debugging information
  const debugInfo = {
    nodeEnv: process.env.NODE_ENV,
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    // If the key exists, show the first few characters to confirm it's loaded correctly
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY ? 
      process.env.ANTHROPIC_API_KEY.substring(0, 7) + '...' : 'not set',
    time: new Date().toISOString(),
    envVars: Object.keys(process.env).filter(key => 
      !key.includes('KEY') && !key.includes('SECRET') && !key.includes('TOKEN')
    ),
  };
  
  // Return debugging information
  return NextResponse.json({
    status: 'ok',
    message: 'Debugging information',
    info: debugInfo,
  });
} 