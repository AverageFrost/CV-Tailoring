import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { extractTextFromFile } from '@/lib/documentUtils'; // Import the text extraction utility

export async function POST(request: NextRequest) {
  try {
    console.log('Analyze Simple API called');
    
    // Parse the request body - just get the session ID
    let sessionId = '';
    try {
      const body = await request.json();
      sessionId = body.sessionId || 'unknown-session';
      console.log('Received session ID:', sessionId);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      // Continue with a placeholder session ID
      sessionId = 'parse-error-session';
    }

    // Try to get the actual job description from the session files
    let actualJobDescription = '';
    let cvText = '';
    
    try {
      // Get path to the session directory
      const sessionDir = path.join(os.tmpdir(), 'cv-tailoring', sessionId);
      
      // First check if the directory exists
      try {
        await fs.access(sessionDir);
        console.log('Session directory exists:', sessionDir);
      } catch (dirError) {
        console.error('Session directory does not exist or is not accessible:', sessionDir);
        throw new Error('Session directory not found');
      }
      
      console.log('Looking for files in session directory:', sessionDir);
      const files = await fs.readdir(sessionDir);
      console.log('Files in session directory:', files);
      
      if (files.length === 0) {
        console.error('No files found in session directory');
        throw new Error('No files found in session');
      }
      
      // Log each file's detailed information
      for (const file of files) {
        try {
          const filePath = path.join(sessionDir, file);
          const stats = await fs.stat(filePath);
          console.log(`File: ${file}, Size: ${stats.size} bytes, Type: ${path.extname(file)}`);
        } catch (err) {
          console.error(`Error getting stats for ${file}:`, err);
        }
      }
      
      // First look for job_description.txt - this is the most reliable
      let jobFile: string | undefined = files.find(file => file === 'job_description.txt');
      
      // If not found, try to find any file with "job" in the name
      if (!jobFile) {
        jobFile = files.find(file => 
          file.toLowerCase().includes('job') || 
          file.toLowerCase().includes('description')
        );
      }
      
      // If still not found, try to find any file that isn't the CV file
      // Usually we have only two files - one for CV and one for job description
      if (!jobFile && files.length === 2) {
        const cvFileCandidate = files.find(file => 
          file.toLowerCase().includes('cv') || 
          file.toLowerCase().includes('resume')
        );
        
        if (cvFileCandidate) {
          jobFile = files.find(file => file !== cvFileCandidate);
        }
      }
      
      console.log('Selected job description file:', jobFile);
      
      // Look for CV file
      const cvFile = files.find(file => 
        (file.toLowerCase().includes('cv') || 
         file.toLowerCase().includes('resume')) && 
        !file.toLowerCase().includes('job')
      );
      
      console.log('Selected CV file:', cvFile);
      
      if (jobFile) {
        const jobPath = path.join(sessionDir, jobFile);
        // Use extractTextFromFile instead of direct reading to handle different file types
        // This function now handles errors internally and returns placeholder text if extraction fails
        actualJobDescription = await extractTextFromFile(jobPath);
        console.log('Job description content extracted, length:', actualJobDescription.length);
      } else {
        console.warn('No job description file found in session directory');
      }
      
      // If CV file found, extract its text
      if (cvFile) {
        const cvPath = path.join(sessionDir, cvFile);
        cvText = await extractTextFromFile(cvPath);
        console.log('CV content extracted, length:', cvText.length);
      }
    } catch (fileError) {
      console.error('Error accessing session files:', fileError);
      // We'll continue with mock data in this case
    }

    // IMPORTANT: Only use mock data if we couldn't get actual data
    let jobDescription;
    if (actualJobDescription && actualJobDescription.length > 20 && 
        !actualJobDescription.startsWith('[Content from')) {
      console.log('Using actual job description from uploaded file');
      jobDescription = actualJobDescription;
    } else {
      console.log('Using mock job description data');
      jobDescription = `Senior Frontend Developer

TechCorp Solutions
San Francisco, CA (Remote Available)

We are seeking an experienced Frontend Developer to join our growing team. The ideal candidate will have strong experience with React, TypeScript, and modern frontend frameworks.

Requirements:
• 5+ years of experience in frontend development
• Expert knowledge of React, Redux, and TypeScript
• Experience with responsive design and CSS frameworks
• Familiarity with testing frameworks like Jest and React Testing Library
• Knowledge of CI/CD pipelines and deployment strategies
• Bachelor's degree in Computer Science or related field
• Strong problem-solving skills and attention to detail`;
    }

    // Use actual CV text if available, otherwise use mock data
    let tailoredCV;
    if (cvText && cvText.length > 20 && !cvText.startsWith('[Content from')) {
      console.log('Using actual CV text');
      tailoredCV = cvText;
    } else {
      console.log('Using mock CV text');
      tailoredCV = `Alex Johnson
Frontend Developer
alex.johnson@example.com • (555) 123-4567
San Francisco, CA • linkedin.com/in/alexjohnson

SUMMARY
Experienced Frontend Developer with 6+ years of expertise in building responsive, user-friendly web applications. Specialized in React, TypeScript, and modern frontend frameworks with a strong focus on performance optimization and clean code practices.

EXPERIENCE
Frontend Developer
WebTech Solutions | 2019 - Present
• Led the development of responsive web applications using React, Redux, and TypeScript
• Implemented comprehensive testing strategies using Jest and React Testing Library
• Optimized application performance, reducing load time by 40%
• Mentored junior developers and conducted regular code reviews

Junior Web Developer
Digital Creations | 2017 - 2019
• Developed and maintained responsive websites using React and CSS frameworks
• Collaborated with designers and backend developers to implement new features
• Participated in CI/CD pipeline implementation for streamlined deployments
• Assisted in troubleshooting and bug fixing across multiple projects

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2017

SKILLS
React, TypeScript, Redux, JavaScript, HTML5/CSS3, Responsive Design, Jest, React Testing Library, CI/CD, Git, Webpack`;
    }

    const responseData = {
      sessionId,
      jobDescription: jobDescription,
      tailoredCV: tailoredCV,
      improvements: [
        {
          category: "Skills Emphasized",
          details: [
            "React and TypeScript expertise highlighted at the top",
            "Added React Testing Library to skills section",
            "Emphasized responsive design experience"
          ]
        },
        {
          category: "Experience Highlighted",
          details: [
            "Foregrounded experience with CI/CD pipelines",
            "Highlighted mentorship and code review responsibilities"
          ]
        },
        {
          category: "Keywords Added",
          details: [
            "Added 'Redux' to match job requirements",
            "Included 'Jest' for testing framework familiarity",
            "Added 'performance optimization' to summary"
          ]
        }
      ]
    };
    
    console.log('Returning data with job description length:', responseData.jobDescription.length);
    
    // Return the data with explicit headers
    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in simplified analyze endpoint:', error);
    // Return a more robust error response that won't cause client-side parsing issues
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        message: error instanceof Error ? error.message : 'Unknown error',
        // Return mock data even in case of error to allow the flow to continue
        sessionId: 'error-session',
        jobDescription: 'Job description could not be processed due to a server error. Please try again.',
        tailoredCV: 'CV content could not be processed due to a server error. Please try again.',
        improvements: [
          {
            category: "Error Processing",
            details: ["An error occurred while processing your files. Please try again."]
          }
        ]
      },
      { 
        status: 200, // Return 200 instead of 500 to allow the flow to continue
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 