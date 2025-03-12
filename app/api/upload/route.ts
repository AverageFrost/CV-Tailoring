import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import os from 'os';

const createDirectoryIfNotExists = async (dir: string) => {
  try {
    await fs.mkdir(dir, { recursive: true });
    return true;
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
    return false;
  }
};

// Ensure the route is dynamic to properly handle abort signals
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Get the abort signal from the request
  const { signal } = request;
  
  // Set up a handler to detect cancellation
  signal.addEventListener('abort', () => {
    console.log('Upload request was cancelled by client');
  });
  
  // Track session information outside the try block so it's available in catch
  let sessionId: string | null = null;
  let sessionDir: string | null = null;
  
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
    sessionId = uuidv4();
    console.log('Created session ID:', sessionId);
    
    // Create fixed backup directory for testing
    const backupDir = path.join(process.cwd(), 'temp', 'backup');
    await createDirectoryIfNotExists(backupDir);
    console.log('Backup directory created at:', backupDir);
    
    // Create a fixed test directory and store job description there too
    const testDir = path.join(process.cwd(), 'temp', 'test-data');
    await createDirectoryIfNotExists(testDir);
    console.log('Test directory created at:', testDir);
    
    // Get temporary directory for this session
    const tmpBaseDir = path.join(os.tmpdir(), 'cv-tailoring');
    await createDirectoryIfNotExists(tmpBaseDir);
    
    // Create temp directory for this session
    sessionDir = path.join(tmpBaseDir, sessionId);
    await createDirectoryIfNotExists(sessionDir);
    console.log('Created session directory:', sessionDir);
    
    // Check if request was cancelled before saving files
    if (signal.aborted) {
      console.log('Upload request cancelled before saving files');
      // Clean up the created directory since we won't be using it
      try {
        if (sessionDir) {
          await fs.rm(sessionDir, { recursive: true, force: true });
          console.log('Cleaned up session directory after cancellation');
        }
      } catch (cleanupError) {
        console.error('Error cleaning up after cancellation:', cleanupError);
      }
      
      return NextResponse.json(
        { error: 'Request cancelled' },
        { status: 499 }
      );
    }
    
    // Save backup CV description in the test directory
    try {
      await fs.writeFile(
        path.join(testDir, 'cv-backup.txt'), 
        'This is a backup CV content for testing'
      );
    } catch (backupError) {
      console.error('Error writing backup CV file:', backupError);
    }
    
    // Save backup job description in the test directory
    try {
      const jobContent = jobDescriptionText || 'This is a job description backup for testing';
      await fs.writeFile(
        path.join(testDir, 'job-backup.txt'), 
        jobContent
      );
      console.log('Saved job description backup to test directory');
    } catch (backupError) {
      console.error('Error writing backup job file:', backupError);
    }
    
    // Save CV file
    try {
      const cvPath = path.join(sessionDir, cvFile.name);
      const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
      await fs.writeFile(cvPath, cvBuffer);
      console.log('Saved CV file to:', cvPath);
      
      // Verify CV file was written properly
      try {
        const fileStats = await fs.stat(cvPath);
        console.log('CV file saved successfully, size:', fileStats.size);
      } catch (statError) {
        console.error('Error verifying CV file:', statError);
      }
    } catch (saveError) {
      console.error('Error saving CV file:', saveError);
    }
    
    // Save job description (either from file or text)
    let jobDescriptionFilename = '';
    try {
      if (jobDescriptionFile) {
        // For uploaded files, make sure the filename contains 'job' to make it easier to identify
        const originalName = jobDescriptionFile.name;
        // If filename doesn't already contain 'job', prefix it with 'job_'
        jobDescriptionFilename = originalName.toLowerCase().includes('job') 
          ? originalName 
          : `job_${originalName}`;
        
        const jobDescriptionPath = path.join(sessionDir, jobDescriptionFilename);
        const jobBuffer = Buffer.from(await jobDescriptionFile.arrayBuffer());
        await fs.writeFile(jobDescriptionPath, jobBuffer);
        console.log('Saved job description file to:', jobDescriptionPath);
        
        // Verify the file was created
        try {
          const fileStats = await fs.stat(jobDescriptionPath);
          console.log('Job description file saved successfully, size:', fileStats.size);
        } catch (statError) {
          console.error('Error verifying job description file:', statError);
        }
      } else if (jobDescriptionText) {
        jobDescriptionFilename = 'job_description.txt';
        const jobDescriptionPath = path.join(sessionDir, jobDescriptionFilename);
        await fs.writeFile(jobDescriptionPath, jobDescriptionText);
        console.log('Saved job description text to:', jobDescriptionPath);
        
        // Verify the file was created
        try {
          const fileStats = await fs.stat(jobDescriptionPath);
          console.log('Job description text saved successfully, size:', fileStats.size);
        } catch (statError) {
          console.error('Error verifying job description text file:', statError);
        }
      }
    } catch (saveError) {
      console.error('Error saving job description:', saveError);
    }
    
    // Verify files were written
    try {
      const files = await fs.readdir(sessionDir);
      console.log('Files in session directory:', files);
    } catch (readError) {
      console.error('Error reading session directory:', readError);
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      sessionId,
      cvFilename: cvFile.name,
      jobDescriptionFilename
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    
    // Check if this is an abort error
    if (error.name === 'AbortError' || signal.aborted) {
      console.log('Upload request was aborted by client');
      
      // Clean up any created resources if possible
      try {
        if (sessionDir) {
          await fs.rm(sessionDir, { recursive: true, force: true });
          console.log('Cleaned up session directory after error cancellation');
        }
      } catch (cleanupError) {
        console.error('Error during cleanup after cancellation:', cleanupError);
      }
      
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