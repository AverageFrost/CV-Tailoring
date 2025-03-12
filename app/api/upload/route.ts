import { NextRequest, NextResponse } from 'next/server';
// Import from local utils directory as a fallback
import * as NetlifyUtils from '../utils/netlifyUtils';
// Destructure what we need
const { createSession, storeFiles } = NetlifyUtils;

// Ensure the route is dynamic to properly handle abort signals
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Get the abort signal from the request
  const { signal } = request;
  
  // Set up a handler to detect cancellation
  signal.addEventListener('abort', () => {
    console.log('Upload request was cancelled by client');
  });
  
  // Check if the request is already aborted
  if (signal.aborted) {
    console.log('Upload request was already aborted before processing');
    return NextResponse.json(
      { error: 'Request cancelled' },
      { status: 499 }
    );
  }
  
  try {
    console.log('Upload API called');
    
    // Check if request was cancelled before reading form data
    if (signal.aborted) {
      console.log('Upload request cancelled before reading form data');
      return NextResponse.json(
        { error: 'Request cancelled' },
        { status: 499 }
      );
    }
    
    const formData = await request.formData();
    
    // Log what we received in the form data
    console.log('Form data keys:', Array.from(formData.keys()));
    
    const cvFile = formData.get('cv') as File | null;
    const jobDescriptionFile = formData.get('jobDescription') as File | null;
    const jobDescriptionText = formData.get('jobDescriptionText') as string | null;
    
    // Log the files/text received
    console.log('CV file received:', cvFile?.name);
    console.log('Job description file received:', jobDescriptionFile?.name);
    console.log('Job description text received:', !!jobDescriptionText);
    
    if (!cvFile || (!jobDescriptionFile && !jobDescriptionText)) {
      console.error('Missing required files or text');
      return NextResponse.json(
        { error: 'Both CV and job description (file or text) are required' },
        { status: 400 }
      );
    }
    
    // Check if request was cancelled after validating files
    if (signal.aborted) {
      console.log('Upload request cancelled after validating files');
      return NextResponse.json(
        { error: 'Request cancelled' },
        { status: 499 }
      );
    }
    
    // Create a session ID
    const sessionId = createSession();
    console.log('Created session ID:', sessionId);
    
    // Process CV file
    let cvBuffer: Buffer | undefined = undefined;
    let cvFileName = '';
    
    if (cvFile) {
      cvBuffer = Buffer.from(await cvFile.arrayBuffer());
      cvFileName = cvFile.name;
      console.log('Processed CV file:', cvFileName, 'size:', cvBuffer.length);
    }
    
    // Process job description
    let jobDescriptionBuffer: Buffer | undefined = undefined;
    let jobDescriptionFileName = '';
    
    if (jobDescriptionFile) {
      jobDescriptionBuffer = Buffer.from(await jobDescriptionFile.arrayBuffer());
      jobDescriptionFileName = jobDescriptionFile.name;
      console.log('Processed job description file:', jobDescriptionFileName, 'size:', jobDescriptionBuffer.length);
    }
    
    // Store files in memory
    storeFiles(
      sessionId,
      cvBuffer,
      cvFileName,
      jobDescriptionBuffer,
      jobDescriptionFileName,
      jobDescriptionText || undefined
    );
    
    // Return success response
    return NextResponse.json({
      success: true,
      sessionId,
      cvFilename: cvFileName,
      jobDescriptionFilename: jobDescriptionFileName || 'job_description.txt'
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    
    // Check if this is an abort error
    if (error.name === 'AbortError' || signal.aborted) {
      console.log('Upload request was aborted by client');
      
      return NextResponse.json(
        { error: 'Request cancelled by user' },
        { status: 499 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to upload files', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}