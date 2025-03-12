"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, ArrowLeft, Star, PlusCircle, Download, Trash2, X, ArrowUpDown, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

// Interface for our analysis results
interface AnalysisResults {
  sessionId: string;
  jobDescription: string;
  tailoredCV: string;
  improvements: Array<{
    category: string;
    details: string[];
  }>;
}

// Sample job posting data
const jobPosting = {
  title: "Senior Frontend Developer",
  company: "TechCorp Solutions",
  location: "San Francisco, CA (Remote Available)",
  description: `We are seeking an experienced Frontend Developer to join our growing team. The ideal candidate will have strong experience with React, TypeScript, and modern frontend frameworks.

Requirements:
• 5+ years of experience in frontend development
• Expert knowledge of React, Redux, and TypeScript
• Experience with responsive design and CSS frameworks
• Familiarity with testing frameworks like Jest and React Testing Library
• Knowledge of CI/CD pipelines and deployment strategies
• Bachelor's degree in Computer Science or related field
• Strong problem-solving skills and attention to detail

Responsibilities:
• Develop and maintain responsive web applications
• Collaborate with designers and backend developers
• Optimize applications for maximum speed and scalability
• Write clean, maintainable, and efficient code
• Participate in code reviews and mentor junior developers
• Stay up-to-date with emerging trends and technologies`,
}

// Sample CV data without highlighting
const cvData = {
  name: "Alex Johnson",
  title: "Frontend Developer",
  contact: {
    email: "alex.johnson@example.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/alexjohnson",
  },
  summary: `Experienced Frontend Developer with 6+ years of expertise in building responsive, user-friendly web applications. Specialized in React, TypeScript, and modern frontend frameworks with a strong focus on performance optimization and clean code practices.`,
  experience: [
    {
      title: "Frontend Developer",
      company: "WebTech Solutions",
      period: "2019 - Present",
      highlights: [
        "Led the development of responsive web applications using React, Redux, and TypeScript",
        "Implemented comprehensive testing strategies using Jest and React Testing Library",
        "Optimized application performance, reducing load time by 40%",
        "Mentored junior developers and conducted regular code reviews",
      ],
    },
    {
      title: "Junior Web Developer",
      company: "Digital Creations",
      period: "2017 - 2019",
      highlights: [
        "Developed and maintained responsive websites using React and CSS frameworks",
        "Collaborated with designers and backend developers to implement new features",
        "Participated in CI/CD pipeline implementation for streamlined deployments",
        "Assisted in troubleshooting and bug fixing across multiple projects",
      ],
    },
  ],
  education: {
    degree: "Bachelor of Science in Computer Science",
    school: "University of California, Berkeley",
    year: "2017",
  },
  skills: [
    "React",
    "TypeScript",
    "Redux",
    "JavaScript",
    "HTML5/CSS3",
    "Responsive Design",
    "Jest",
    "React Testing Library",
    "CI/CD",
    "Git",
    "Webpack",
  ],
}

// Improvements data
const improvements = [
  {
    type: "keywords",
    title: "Added Keywords",
    items: ["React Testing Library", "CI/CD pipelines", "Redux", "Responsive design"],
    icon: PlusCircle,
  },
  {
    type: "enhanced",
    title: "Enhanced Descriptions",
    items: [
      "Strengthened experience with React and TypeScript",
      "Highlighted mentoring experience",
      "Emphasized optimization skills",
      "Added specific testing framework experience",
    ],
    icon: Star,
  },
  {
    type: "removed",
    title: "Removed Content",
    items: [
      "Removed irrelevant volunteer experience",
      "Trimmed outdated technical skills",
      "Removed unrelated certifications",
    ],
    icon: Trash2,
  },
  {
    type: "reordered",
    title: "Reordered Content",
    items: [
      "Moved most relevant experience to the top",
      "Prioritized skills matching job requirements",
      "Restructured summary to highlight key qualifications",
    ],
    icon: ArrowUpDown,
  },
]

export default function ResultsPage() {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)
  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [error, setError] = useState("")
  const [showSuccessMessage, setShowSuccessMessage] = useState(true)

  // Load the analysis results from sessionStorage
  useEffect(() => {
    try {
      const storedResults = sessionStorage.getItem('analysisResults');
      if (!storedResults) {
        setError("Analysis results not found. Please restart the process.");
        return;
      }
      
      try {
        const parsedResults = JSON.parse(storedResults) as AnalysisResults;
        
        // Validate the parsed data has the required fields
        if (!parsedResults.tailoredCV || !Array.isArray(parsedResults.improvements)) {
          setError("Invalid analysis results format. Missing required fields.");
          return;
        }
        
        setResults(parsedResults);
      } catch (parseError) {
        console.error('Error parsing stored results:', parseError);
        setError("Error parsing analysis results. Please restart the process.");
      }
    } catch (error) {
      console.error('Error loading results:', error);
      setError("Error loading analysis results.");
    }
  }, []);

  const handleGoBack = () => {
    router.push('/');
  };

  const handleDownload = async (type: 'cv' | 'improvements' = 'cv') => {
    if (!results) return;
    
    try {
      setIsDownloading(true);
      
      // First save the content to the server
      const saveResponse = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId: results.sessionId, 
          content: type === 'cv' ? results.tailoredCV : formatImprovementsForDownload(results.improvements),
          type
        }),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save content for download');
      }
      
      // Then trigger the download
      const downloadUrl = `/api/download?sessionId=${results.sessionId}&type=${type}`;
      
      // Create a temporary link element and click it to trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = type === 'cv' ? 'tailored_cv.docx' : 'improvements.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  // Format the improvements data for download
  const formatImprovementsForDownload = (improvements: AnalysisResults['improvements']) => {
    return improvements.map(imp => {
      return `# ${imp.category}\n${imp.details.map(detail => `- ${detail}`).join('\n')}\n`;
    }).join('\n');
  };

  // Group improvements by category
  const groupedImprovements = results?.improvements.reduce((acc, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = [];
    }
    acc[curr.category] = acc[curr.category].concat(curr.details);
    return acc;
  }, {} as Record<string, string[]>) || {};

  // Get the appropriate icon for each improvement category
  const getCategoryIcon = (category: string) => {
    // Normalize the category name for matching
    const normalizedCategory = category.trim();
    
    // Match the exact category names from the UI
    switch (normalizedCategory) {
      case 'Key Changes':
        return Award; // Award icon for key changes
      case 'Professional Summary':
        return Star; // Star for professional summary
      case 'Employment History':
        return ArrowUpDown; // ArrowUpDown for employment history
      case 'Areas of Expertise':
        return Check; // Check for areas of expertise
      case 'Technical Skills':
        return PlusCircle; // PlusCircle for technical skills
      case 'Alignment with Job':
        return Check; // Check for job alignment
      case 'Keywords Added':
        return PlusCircle; // PlusCircle for keywords
      case 'Experience Highlighted':
        return Award; // Award for highlighted experience
      case 'Skills Emphasized':
        return Star; // Star for emphasized skills
      case 'Removed Content':
        return Trash2; // Trash for removed content
      default:
        return Star; // Default to star
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow p-6">
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleGoBack}>Return to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
          <p className="text-center">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100">
      <div className="container max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2 text-[#3F2A51]">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-[#3F2A51]">Your Tailored CV</h1>
        </div>

        {/* Success message */}
        {showSuccessMessage && (
          <div className="bg-green-50 border border-green-100 rounded-md p-4 mb-6 flex items-start">
            <Check className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-grow">
              <h3 className="font-semibold text-green-800">Success!</h3>
              <p className="text-green-700">Your CV has been tailored to match the job description. You can now copy it into your own CV format for editing or start over.</p>
            </div>
            <button 
              onClick={() => setShowSuccessMessage(false)} 
              className="text-green-500 hover:text-green-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main content - Two columns for Job Description and Tailored CV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Job Description */}
          <div className="bg-white rounded-lg shadow">
            <div className="h-[60px] p-4 border-b border-gray-100 flex items-center">
              <h2 className="text-xl font-semibold text-[#3F2A51]">Job Description</h2>
            </div>
            <ScrollArea className="h-[600px] w-full" scrollHideDelay={0}>
              <div className="p-4">
                <div className="whitespace-pre-wrap">
                  {results?.jobDescription?.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-3">{paragraph}</p>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Tailored CV */}
          <div className="bg-white rounded-lg shadow">
            <div className="h-[60px] p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#3F2A51]">Tailored CV</h2>
              <Button
                size="sm"
                className="flex items-center bg-[#3F2A51] hover:bg-[#5A3A75] text-white"
                onClick={() => handleDownload('cv')}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
            <ScrollArea className="h-[600px] w-full" scrollHideDelay={0}>
              <div className="p-4">
                <div className="whitespace-pre-wrap">
                  {results?.tailoredCV?.split('\n').map((line, i) => (
                    <p key={i} className={line.trim() === '' ? 'mb-3' : 'mb-1'}>{line}</p>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Improvements section moved to bottom */}
        <div className="bg-white rounded-lg shadow">
          <div className="h-[60px] p-4 border-b border-gray-100 flex items-center">
            <h2 className="text-xl font-semibold text-[#3F2A51]">Improvements</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Map all improvement categories with appropriate icons */}
              {Object.entries(groupedImprovements).map(([category, items]) => {
                const Icon = getCategoryIcon(category);
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center mb-2">
                      <Icon className="h-5 w-5 text-[#3F2A51] mr-2" />
                      <h3 className="font-medium text-[#3F2A51]">{category}</h3>
                    </div>
                    <ul className="ml-7 space-y-1">
                      {items.map((item, i) => (
                        <li key={i} className="text-gray-700 flex items-start pl-1">
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

