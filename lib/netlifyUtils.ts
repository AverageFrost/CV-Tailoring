import { randomUUID } from 'crypto';
import mammoth from 'mammoth';

// In-memory storage for files and session data
// This is necessary because Netlify serverless functions have ephemeral filesystem
const memoryStorage: Record<string, {
  cvBuffer?: Buffer;
  cvFileName?: string;
  jobDescriptionBuffer?: Buffer;
  jobDescriptionFileName?: string;
  jobDescriptionText?: string;
  results?: any;
  createdAt: number; // timestamp for cleanup purposes
}> = {};

// Session timeout (1 hour)
const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

// Clean up expired sessions periodically
const cleanupSessions = () => {
  const now = Date.now();
  Object.keys(memoryStorage).forEach(sessionId => {
    if (now - memoryStorage[sessionId].createdAt > SESSION_TIMEOUT_MS) {
      delete memoryStorage[sessionId];
    }
  });
};

// Run cleanup every 15 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupSessions, 15 * 60 * 1000);
}

/**
 * Create a new session
 */
export const createSession = () => {
  const sessionId = randomUUID();
  memoryStorage[sessionId] = { createdAt: Date.now() };
  return sessionId;
};

/**
 * Store file data in memory for a session
 */
export const storeFiles = (
  sessionId: string,
  cvBuffer?: Buffer,
  cvFileName?: string,
  jobDescriptionBuffer?: Buffer,
  jobDescriptionFileName?: string,
  jobDescriptionText?: string
) => {
  if (!memoryStorage[sessionId]) {
    memoryStorage[sessionId] = { createdAt: Date.now() };
  }

  if (cvBuffer) memoryStorage[sessionId].cvBuffer = cvBuffer;
  if (cvFileName) memoryStorage[sessionId].cvFileName = cvFileName;
  if (jobDescriptionBuffer) memoryStorage[sessionId].jobDescriptionBuffer = jobDescriptionBuffer;
  if (jobDescriptionFileName) memoryStorage[sessionId].jobDescriptionFileName = jobDescriptionFileName;
  if (jobDescriptionText) memoryStorage[sessionId].jobDescriptionText = jobDescriptionText;
};

/**
 * Get file data for a session
 */
export const getFiles = (sessionId: string) => {
  return memoryStorage[sessionId] || { createdAt: 0 };
};

/**
 * Store analysis results
 */
export const storeResults = (sessionId: string, results: any) => {
  if (!memoryStorage[sessionId]) {
    memoryStorage[sessionId] = { createdAt: Date.now() };
  }
  memoryStorage[sessionId].results = results;
};

/**
 * Get analysis results
 */
export const getResults = (sessionId: string) => {
  return memoryStorage[sessionId]?.results;
};

/**
 * Clean up session data
 */
export const cleanupSession = (sessionId: string) => {
  delete memoryStorage[sessionId];
};

/**
 * Extract text from a DOCX buffer
 */
export const extractTextFromDocxBuffer = async (buffer: Buffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX buffer:', error);
    return '[Error extracting DOCX content]';
  }
};

/**
 * Extract text from a TXT buffer
 */
export const extractTextFromTxtBuffer = (buffer: Buffer): string => {
  try {
    return buffer.toString('utf8');
  } catch (error) {
    console.error('Error extracting text from TXT buffer:', error);
    return '[Error extracting text content]';
  }
};

/**
 * Extract text from a buffer based on file extension
 */
export const extractTextFromBuffer = async (buffer: Buffer, fileName: string): Promise<string> => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (extension === 'docx') {
    return extractTextFromDocxBuffer(buffer);
  } else if (extension === 'txt') {
    return extractTextFromTxtBuffer(buffer);
  } else {
    return `[Unsupported file type: ${extension}]`;
  }
};

/**
 * Check if a session exists
 */
export const sessionExists = (sessionId: string): boolean => {
  return !!memoryStorage[sessionId];
};

/**
 * Get active session count (for debugging)
 */
export const getSessionCount = (): number => {
  return Object.keys(memoryStorage).length;
}; 