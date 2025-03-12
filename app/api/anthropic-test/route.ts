import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Check if API key is configured
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key is not configured' },
        { status: 500 }
      );
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    });
    
    // Make a simple request to Anthropic
    try {
      console.log('Making test request to Anthropic API...');
      
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 100,
        messages: [
          { role: "user", content: "Hello Claude, please respond with a simple JSON object: {\"status\": \"success\"}" }
        ]
      });
      
      console.log('Received response from Anthropic API test');
      
      // Return success response
      return NextResponse.json({
        status: 'success',
        message: 'Successfully connected to Anthropic API',
        response: response.content
      });
    } catch (apiError: any) {
      console.error('Anthropic API error:', apiError);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Anthropic API',
          message: apiError.message,
          details: apiError.toString()
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { error: 'Test endpoint error', message: error.message },
      { status: 500 }
    );
  }
} 