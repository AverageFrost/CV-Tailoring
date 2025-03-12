import { NextRequest, NextResponse } from 'next/server';
import { getFiles, storeResults, extractTextFromBuffer, sessionExists } from '@/lib/netlifyUtils';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
let anthropic: Anthropic | null = null;
try {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    anthropic = new Anthropic({
      apiKey,
    });
    console.log('Anthropic client initialized successfully');
  } else {
    console.error('ANTHROPIC_API_KEY is not set in environment variables');
  }
} catch (error) {
  console.error('Failed to initialize Anthropic client:', error);
}

// Ensure the route is dynamic to properly handle abort signals
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Ensure we respond with JSON content type
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Get the abort signal from the request
  const { signal } = request;
  
  // Set up a handler to detect cancellation
  signal.addEventListener('abort', () => {
    console.log('Request was cancelled by client');
  });
  
  // Check if the request is already aborted
  if (signal.aborted) {
    console.log('Request was already aborted before processing');
    return NextResponse.json(
      { error: 'Request cancelled' },
      { status: 499, headers }
    );
  }
  
  try {
    // Parse the request JSON
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers }
      );
    }
    
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400, headers }
      );
    }
    
    // Validate API is initialized
    if (!anthropic) {
      console.error('Anthropic client is not initialized');
      return NextResponse.json(
        { error: 'AI service is not available' },
        { status: 503, headers }
      );
    }
    
    // Check if session exists
    if (!sessionExists(sessionId)) {
      console.error('Session not found:', sessionId);
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404, headers }
      );
    }
    
    // Get files from the session
    const sessionData = getFiles(sessionId);
    
    // Check if we have the required files
    if (!sessionData.cvBuffer || (!sessionData.jobDescriptionBuffer && !sessionData.jobDescriptionText)) {
      console.error('Missing required files in session');
      return NextResponse.json(
        { error: 'Required files not found in session' },
        { status: 400, headers }
      );
    }
    
    // Extract text from files
    let cvText = '';
    let jobText = '';
    
    try {
      // Check for cancellation before text extraction
      if (signal.aborted) {
        console.log('Request cancelled before text extraction');
        return NextResponse.json(
          { error: 'Request cancelled' },
          { status: 499, headers }
        );
      }
      
      // Extract CV text
      if (sessionData.cvBuffer && sessionData.cvFileName) {
        cvText = await extractTextFromBuffer(sessionData.cvBuffer, sessionData.cvFileName);
      }
      
      // Extract job description text
      if (sessionData.jobDescriptionBuffer && sessionData.jobDescriptionFileName) {
        jobText = await extractTextFromBuffer(sessionData.jobDescriptionBuffer, sessionData.jobDescriptionFileName);
      } else if (sessionData.jobDescriptionText) {
        jobText = sessionData.jobDescriptionText;
      }
      
      console.log('CV text length:', cvText.length);
      console.log('Job description text length:', jobText.length);
    } catch (extractError) {
      console.error('Error extracting text from files:', extractError);
      return NextResponse.json(
        { error: 'Failed to extract text from files' },
        { status: 500, headers }
      );
    }
    
    // Call Claude API to tailor the CV
    console.log('Calling Anthropic API to tailor CV...');
    
    // Check for cancellation before API call
    if (signal.aborted) {
      console.log('Request cancelled before Anthropic API call');
      return NextResponse.json(
        { error: 'Request cancelled' },
        { status: 499, headers }
      );
    }
    
    try {
      // Prepare the system prompt
      const systemPrompt = `You are a professional CV optimization assistant specializing in tailoring resumes to specific job descriptions. Your objective is to transform the user's existing CV into a highly targeted and ATS-friendly document that aligns precisely with the job requirements.

### Core Guidelines:
1. **Role Alignment**:
   - Analyze both the CV and the job description thoroughly.
   - Identify the key themes and competencies from the job description (e.g., strategy, implementation, team leadership, regulatory compliance).
   - Structure the revised CV under thematic headers that align with the role's core responsibilities.

2. **Experience Refinement**:
   - Emphasize the most relevant achievements using the STAR (Situation, Task, Action, Result) framework.
   - Prioritize work experiences that demonstrate direct alignment with the job's requirements (e.g., investment product development, cross-functional collaboration).
   - Quantify achievements wherever possible (e.g., % improvements, $ value impacts, or project scales).

3. **Language Optimization**:
   - Incorporate job-specific keywords and phrases from the job description to improve ATS optimization.
   - Use clear, professional language that conveys leadership, problem-solving ability, and technical expertise.
   - Avoid vague or general phrases—favor precise, action-oriented statements.

4. **Formatting and Clarity**:
   - Organize experiences under well-defined categories (e.g., "Product Strategy & Innovation," "Risk Management & Compliance") relevant for the role.
   - Ensure a clear, logical flow that highlights the candidate's career progression and increasing levels of responsibility.
   - Keep the formatting professional and concise, with bullet points emphasizing key achievements.

### Output Structure:
1. Contact Information (Keep existing format)
2. Professional Summary (2-3 sentences highlighting expertise aligned with the job's core focus)
3. Employment History (Tailored to highlight relevant experience and achievements)
4. Education (Standardized format, emphasizing relevant degrees or certifications)
5. Areas of Expertise (Skills aligned with the job's core requirements)
6. Technical Skills (Specific software or tools required by the job)
7. Additional Information (Optional: Certifications, languages, or other relevant details)

### Tone & Voice:
- Maintain a professional and confident tone throughout.
- Reflect a growth narrative: demonstrate increasing responsibilities and leadership impact over time.
- Emphasize cross-functional collaboration and strategic thinking where applicable.

When generating a revised CV, maintain a balance between comprehensiveness and conciseness targeting a similar total word count for each CV section of the existing CV. Ensure the candidate's experience is framed to directly support their candidacy for the target role outlined in the job description.`;

      // User message template
      const userMessageTmpl = `You are an AI recruitment assistant tasked with tailoring a CV (Curriculum Vitae) to a specific job description. This task is crucial for helping job seekers increase their chances of securing an interview by highlighting relevant skills and experiences that match the job requirements.

First, carefully read and analyze the following CV:

<cv>
{{CV}}
</cv>

Now, examine the job description for the position the CV needs to be tailored to:

<job_description>
{{JOB_DESCRIPTION}}
</job_description>

Analyze the job description, paying close attention to:
1. Required skills and qualifications
2. Preferred experiences
3. Key responsibilities
4. Industry-specific terminology or buzzwords

Compare the content of the CV with the job description, identifying:
1. Matching skills and experiences
2. Relevant accomplishments
3. Areas where the CV falls short of the job requirements

Now, update the CV content to better align with the job description while maintaining the original CV section structure. Follow these guidelines:

1. Emphasize relevant skills and experiences by moving them to more prominent positions within each section.
2. Rephrase accomplishments and responsibilities to use similar language as the job description.
3. Add any relevant skills or experiences that are in the CV but not prominently featured.
4. Do not invent or add false information to the CV.
5. Maintain the overall structure, formatting, and sections of the original CV.
6. Ensure the updated CV is ATS (Applicant Tracking System) friendly by using key terms from the job description where appropriate.

Present your updated CV inside <updated_cv> tags. After the updated CV, provide a brief explanation of the changes made and how they align with the job description inside <explanation> tags. Consider explanations for key changes, professional summary, employment history, keywords added, removed content. Do not inject any markups into the CV (e.g.,: [Rest of the CV remains structurally similar, with subtle language refinements to emphasize...etc.])

Remember to maintain professionalism and accuracy throughout the tailoring process.`;

      // Update with the correct CV and job description
      const userMessage = userMessageTmpl
        .replace('{{CV}}', cvText)
        .replace('{{JOB_DESCRIPTION}}', jobText);

      // Make the API call
      console.log('Sending request to Anthropic API...');
      
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
      });
      
      console.log('Received response from Anthropic API');
      
      // Process the response
      const responseContent = response.content[0];
      const responseText = responseContent.type === 'text' ? responseContent.text : '';
      
      // Extract the updated CV and explanation
      const updatedCV = extractContentBetweenTags(responseText, 'updated_cv');
      const explanation = extractContentBetweenTags(responseText, 'explanation');
      
      // Parse improvements from the explanation
      const improvements = extractImprovements(explanation);
      
      // Store the results in memory
      const analysisResults = {
        originalCV: cvText,
        jobDescription: jobText,
        tailoredCV: updatedCV || responseText,
        improvements: improvements || [],
        explanation: explanation || 'No detailed explanation provided.',
      };
      
      console.log('Analysis complete, storing results');
      storeResults(sessionId, analysisResults);
      
      return NextResponse.json(analysisResults, { headers });
    } catch (anthropicError: any) {
      console.error('Error calling Anthropic API:', anthropicError);
      
      // Detailed error response
      return NextResponse.json(
        { 
          error: 'Failed to analyze CV and job description',
          message: anthropicError.message || 'Unknown error',
          status: 503,
          details: anthropicError.response?.data?.error || 'Service unavailable'
        },
        { status: 503, headers }
      );
    }
  } catch (error: any) {
    console.error('General error in analyze endpoint:', error);
    
    // General error handling
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        message: error.message || 'Unknown error',
        status: error.status || 500
      },
      { status: error.status || 500, headers }
    );
  }
}

// Helper function to extract content between tags
function extractContentBetweenTags(text: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// Helper function to extract improvements from explanation
function extractImprovements(explanation: string | null): string[] {
  if (!explanation) return [];
  
  // Look for numbered lists, bullet points, or keywords like "improvements" or "changes"
  const points: string[] = [];
  
  // Split by newlines and look for patterns
  const lines = explanation.split('\n');
  
  let inList = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if line starts with a number or bullet
    if (/^\d+[\.\)]\s+/.test(trimmedLine) || /^[\-\*•]\s+/.test(trimmedLine)) {
      inList = true;
      points.push(trimmedLine);
    }
    // If we're in a list and this line is indented, it's likely a continuation
    else if (inList && line.startsWith('  ')) {
      // Append to the previous point
      if (points.length > 0) {
        points[points.length - 1] += ' ' + trimmedLine;
      }
    }
    // If line contains keywords but isn't a list item
    else if (
      (trimmedLine.toLowerCase().includes('improvement') || 
       trimmedLine.toLowerCase().includes('change') ||
       trimmedLine.toLowerCase().includes('update') ||
       trimmedLine.toLowerCase().includes('modify')) &&
      trimmedLine.length < 100 // Not too long
    ) {
      points.push(trimmedLine);
    }
    else {
      inList = false;
    }
  }
  
  // If we couldn't extract specific points, create a generic entry
  if (points.length === 0 && explanation) {
    points.push('Tailored CV to better match job requirements');
  }
  
  return points;
}