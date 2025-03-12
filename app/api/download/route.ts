import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Document, Paragraph, Packer } from 'docx';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const type = request.nextUrl.searchParams.get('type') || 'cv';
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Get the path to the tailored CV file
    const tailoredCVPath = path.join(
      os.tmpdir(), 
      'cv-tailoring', 
      sessionId, 
      `tailored_${type}.docx`
    );
    
    try {
      const fileContent = await fs.readFile(tailoredCVPath);
      
      // Set headers for download
      const headers = {
        'Content-Disposition': `attachment; filename="tailored_${type}.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      
      return new NextResponse(fileContent, { headers });
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, content, type = 'cv' } = await request.json();
    
    if (!sessionId || !content) {
      return NextResponse.json(
        { error: 'Session ID and content are required' },
        { status: 400 }
      );
    }
    
    // Create a new DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: content.split('\n').map((line: string) => 
          new Paragraph({
            text: line,
            spacing: {
              after: 200,
              line: 276,
              lineRule: 'auto'
            }
          })
        )
      }]
    });

    // Generate the DOCX file buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Save tailored content to the session directory
    const sessionDir = path.join(os.tmpdir(), 'cv-tailoring', sessionId);
    const tailoredPath = path.join(sessionDir, `tailored_${type}.docx`);
    
    await fs.writeFile(tailoredPath, buffer);
    
    return NextResponse.json({
      success: true,
      filePath: tailoredPath
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: 'Failed to save content' },
      { status: 500 }
    );
  }
}