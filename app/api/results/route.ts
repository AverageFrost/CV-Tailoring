import { NextRequest, NextResponse } from 'next/server';
import { getResults, sessionExists } from '@/lib/netlifyUtils';

// Ensure the route is dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Extract the session ID from the URL parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the session exists
    if (!sessionExists(sessionId)) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }
    
    // Get the analysis results
    const results = getResults(sessionId);
    
    if (!results) {
      return NextResponse.json(
        { error: 'No analysis results found for this session' },
        { status: 404 }
      );
    }
    
    // Return the results
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error retrieving results:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve results', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 