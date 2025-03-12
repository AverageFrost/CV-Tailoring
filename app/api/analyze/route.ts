import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile, getSessionFiles } from '@/lib/documentUtils';
import path from 'path';
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
    
    // Get files from the session
    let sessionFiles;
    try {
      // Check for cancellation before file operation
      if (signal.aborted) {
        console.log('Request cancelled before retrieving session files');
        return NextResponse.json(
          { error: 'Request cancelled' },
          { status: 499, headers }
        );
      }
      
      sessionFiles = await getSessionFiles(sessionId);
      
      if (!sessionFiles.success || !sessionFiles.files) {
        return NextResponse.json(
          { error: 'Session not found or expired' },
          { status: 404, headers }
        );
      }
    } catch (sessionError) {
      console.error('Error retrieving session files:', sessionError);
      return NextResponse.json(
        { error: 'Failed to retrieve session files' },
        { status: 500, headers }
      );
    }
    
    console.log('Files in session directory:', sessionFiles.files);
    
    // Find CV and job description files
    let cvFile = sessionFiles.files.find((file) => 
      file.toLowerCase().includes('cv') || 
      (!file.toLowerCase().includes('job') && !file.toLowerCase().includes('description'))
    );
    
    let jobFile = sessionFiles.files.find((file) => 
      file.toLowerCase().includes('job') || 
      file.toLowerCase().includes('description')
    );
    
    if (!cvFile || !jobFile) {
      console.error('Required files not found. CV file:', cvFile, 'Job file:', jobFile);
      return NextResponse.json(
        { error: 'Required files not found in session' },
        { status: 400, headers }
      );
    }
    
    console.log('Found CV file:', cvFile);
    console.log('Found job description file:', jobFile);
    
    // Extract text from both files
    let cvText, jobText;
    try {
      // Check for cancellation before text extraction
      if (signal.aborted) {
        console.log('Request cancelled before text extraction');
        return NextResponse.json(
          { error: 'Request cancelled' },
          { status: 499, headers }
        );
      }
      
      cvText = await extractTextFromFile(path.join(sessionFiles.directory, cvFile));
      jobText = await extractTextFromFile(path.join(sessionFiles.directory, jobFile));
      
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

      // Also update the user message to include the new instruction about not injecting markups
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

      // Call Anthropic API with the abort signal
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 8192,
        temperature: 0.9,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
      }, { signal }); // Pass the signal to the Anthropic client
      
      console.log('Received response from Anthropic API');
      
      // Extract the tailored CV and explanation from response
      const responseText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      let tailoredCV = '';
      let improvements: Array<{category: string, details: string[]}> = [];
      let explanation = '';
      
      // Extract the updated CV
      const cvMatch = /<updated_cv>([\s\S]*?)<\/updated_cv>/i.exec(responseText);
      if (cvMatch && cvMatch[1]) {
        tailoredCV = cvMatch[1].trim();
      } else {
        // If no tags, try to extract the CV portion of the response
        tailoredCV = responseText.split('<explanation>')[0].trim();
      }
      
      // Extract the explanation
      const explanationMatch = /<explanation>([\s\S]*?)<\/explanation>/i.exec(responseText);
      if (explanationMatch && explanationMatch[1]) {
        explanation = explanationMatch[1].trim();
        
        // Parse the explanation into improvement categories
        const sections = explanation.split(/\n\n|\r\n\r\n/);
        
        sections.forEach(section => {
          if (section.trim()) {
            const lines = section.split(/\n|\r\n/);
            if (lines.length > 0) {
              const category = lines[0].replace(/^[\d\.\s-]*/, '').trim();
              const details = lines.slice(1).map(line => 
                line.trim().replace(/^[\-\*\•\s]+/, '')
              ).filter(line => line.length > 0);
              
              if (category && details.length > 0) {
                improvements.push({ category, details });
              }
            }
          }
        });
        
        // If we couldn't parse the explanation into categories, create a single category
        if (improvements.length === 0 && explanation) {
          improvements = [
            {
              category: "CV Improvements",
              details: explanation.split(/\n|\r\n/).filter(line => line.trim().length > 0)
            }
          ];
        }
      }
      
      // If we still don't have improvements, create default categories
      if (improvements.length === 0) {
        improvements = [
          {
            category: "Skills Emphasized",
            details: ["Key skills aligned with job requirements", "ATS-friendly keywords added"]
          },
          {
            category: "Experience Highlighted",
            details: ["Relevant experience prioritized", "Achievements quantified where possible"]
          },
          {
            category: "Structure Optimized",
            details: ["CV structure maintained but content prioritized for this role"]
          }
        ];
      }
      
      // Format for UI display
      const uiContent = {
        sessionId,
        jobDescription: jobText,
        tailoredCV: tailoredCV,
        improvements: improvements
      };
      
      // Return the response with explicit JSON headers
      return NextResponse.json(uiContent, { headers });
      
    } catch (apiError: any) {
      console.error('Error calling Anthropic API:', apiError);
      
      // Check if this is an abort error
      if (apiError.name === 'AbortError' || signal.aborted) {
        console.log('Anthropic API call was aborted by client');
        return NextResponse.json(
          { error: 'Request cancelled by user' },
          { status: 499, headers }
        );
      }
      
      // Create fallback response using the original CV
      const fallbackData = {
        sessionId,
        jobDescription: jobText,
        tailoredCV: cvText,
        improvements: [
          {
            category: "API Error",
            details: ["An error occurred while tailoring your CV. Using original CV content instead."]
          }
        ]
      };
      
      return NextResponse.json(fallbackData, { headers });
    }
    
  } catch (error: any) {
    console.error('Analysis error:', error);
    
    // Check if this is an abort error
    if (error.name === 'AbortError' || signal.aborted) {
      console.log('Request was aborted by client');
      return NextResponse.json(
        { error: 'Request cancelled by user' },
        { status: 499, headers }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze documents', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers }
    );
  }
}