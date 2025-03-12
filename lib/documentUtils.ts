import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import mammoth from 'mammoth';

// Use dynamic import for pdf-parse to avoid issues with server components
let pdfParse: any = null;

// This function safely tries to extract text from a file based on its extension
export async function extractTextFromFile(filePath: string) {
  const fileExtension = path.extname(filePath).toLowerCase();
  
  console.log(`Extracting text from file: ${filePath} with extension: ${fileExtension}`);
  
  try {
    if (fileExtension === '.pdf') {
      return await extractTextFromPdf(filePath);
    } else if (fileExtension === '.docx') {
      return await extractTextFromDocx(filePath);
    } else {
      // For txt files or any other type, try to read as text
      console.log('Reading as text file:', filePath);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
      } catch (textError) {
        console.error(`Error reading text file: ${filePath}`, textError);
        // For non-text files, return a placeholder
        return `[Content from ${path.basename(filePath)} - could not be extracted]`;
      }
    }
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    // Return a placeholder instead of throwing
    return `[Content from ${path.basename(filePath)} - extraction failed]`;
  }
}

async function extractTextFromPdf(filePath: string) {
  try {
    console.log('Extracting text from PDF:', filePath);
    
    // Dynamically import pdf-parse only when needed
    if (!pdfParse) {
      try {
        const pdfParseModule = await import('pdf-parse');
        pdfParse = pdfParseModule.default;
      } catch (importError) {
        console.error('Failed to import pdf-parse module:', importError);
        return `[PDF content from ${path.basename(filePath)} - PDF parser unavailable]`;
      }
    }
    
    // Verify the file exists before trying to read it
    try {
      await fs.access(filePath);
    } catch (accessError) {
      console.error(`PDF file does not exist or cannot be accessed: ${filePath}`, accessError);
      return `[PDF content from ${path.basename(filePath)} - file not accessible]`;
    }
    
    const dataBuffer = await fs.readFile(filePath);
    console.log('PDF buffer size:', dataBuffer.length);
    
    try {
      const data = await pdfParse(dataBuffer);
      console.log('PDF parsed, extracted text length:', data.text.length);
      return data.text;
    } catch (parseError) {
      console.error('Error parsing PDF content:', parseError);
      return `[PDF content from ${path.basename(filePath)} - parsing failed]`;
    }
  } catch (error) {
    console.error('Error in PDF extraction process:', error);
    return `[PDF content from ${path.basename(filePath)} - extraction error]`;
  }
}

async function extractTextFromDocx(filePath: string) {
  try {
    console.log('Extracting text from DOCX:', filePath);
    
    // Verify the file exists before trying to read it
    try {
      await fs.access(filePath);
    } catch (accessError) {
      console.error(`DOCX file does not exist or cannot be accessed: ${filePath}`, accessError);
      return `[DOCX content from ${path.basename(filePath)} - file not accessible]`;
    }
    
    const dataBuffer = await fs.readFile(filePath);
    console.log('DOCX buffer size:', dataBuffer.length);
    
    try {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      console.log('DOCX parsed, extracted text length:', result.value.length);
      return result.value;
    } catch (parseError) {
      console.error('Error parsing DOCX content:', parseError);
      return `[DOCX content from ${path.basename(filePath)} - parsing failed]`;
    }
  } catch (error) {
    console.error('Error in DOCX extraction process:', error);
    return `[DOCX content from ${path.basename(filePath)} - extraction error]`;
  }
}

interface SessionFilesSuccess {
  success: true;
  directory: string;
  files: string[];
}

interface SessionFilesError {
  success: false;
  error: string;
}

export type SessionFilesResult = SessionFilesSuccess | SessionFilesError;

export async function getSessionFiles(sessionId: string): Promise<SessionFilesResult> {
  const sessionDir = path.join(os.tmpdir(), 'cv-tailoring', sessionId);
  
  try {
    const files = await fs.readdir(sessionDir);
    return {
      success: true,
      directory: sessionDir,
      files
    };
  } catch (error) {
    console.error(`Error accessing session directory for ${sessionId}:`, error);
    return {
      success: false,
      error: 'Session not found or expired'
    };
  }
}