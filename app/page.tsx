"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileUploader } from "@/components/file-uploader"
import { Button } from "@/components/ui/button"
import { ArrowRight, AlertCircle, Loader2, X, Check } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PencilIcon } from "@/components/pencil-icon"

export default function Home() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasCv, setHasCv] = useState(false)
  const [hasJobDescription, setHasJobDescription] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [estimatedTime, setEstimatedTime] = useState(30) // Estimated time in seconds
  const [showErrorBanner, setShowErrorBanner] = useState(false)
  
  // Store the files
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null)
  const [jobDescriptionText, setJobDescriptionText] = useState("")
  
  // Reference to abort controller for cancelling API calls
  const abortControllerRef = useRef<AbortController | null>(null)

  // Countdown timer effect
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;
    
    if (isProcessing && estimatedTime > 0) {
      countdownInterval = setInterval(() => {
        setEstimatedTime((prevTime) => {
          if (prevTime <= 1) {
            // Clear the interval when we reach 0
            if (countdownInterval) clearInterval(countdownInterval);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    // Cleanup function to clear the interval when component unmounts or deps change
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [isProcessing, estimatedTime]);

  const handleTailorCV = async () => {
    if (!hasCv || !hasJobDescription) {
      setShowAlert(true)
      return
    }

    try {
      setIsUploading(true)
      setIsProcessing(true)
      setErrorMessage("")
      setShowErrorBanner(false)
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal
      
      // Set the initial estimated processing time (with buffer)
      setEstimatedTime(30) // ~25 seconds for processing + 5 second buffer
      
      // Create a FormData object to send the files
      const formData = new FormData()
      
      // Add the CV file
      if (cvFile) {
        formData.append('cv', cvFile)
      }
      
      // Add either the job description file or text
      if (jobDescriptionFile) {
        formData.append('jobDescription', jobDescriptionFile)
      } else if (jobDescriptionText) {
        formData.append('jobDescriptionText', jobDescriptionText)
      }
      
      console.log('Sending files:', cvFile?.name, jobDescriptionFile?.name || 'Text content')
      
      // Step 1: Upload files
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal, // Add abort signal
      })
      
      if (!uploadResponse.ok) {
        let errorData;
        try {
          errorData = await uploadResponse.json();
        } catch (e) {
          throw new Error(`Failed to upload files: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        throw new Error(errorData.error || 'Failed to upload files')
      }
      
      const uploadData = await uploadResponse.json()
      
      if (!uploadData.sessionId) {
        throw new Error('No session ID returned from server')
      }
      
      const sessionId = uploadData.sessionId
      
      // Store the session info in sessionStorage
      sessionStorage.setItem('sessionId', sessionId)
      sessionStorage.setItem('cvFilename', uploadData.cvFilename)
      sessionStorage.setItem('jobDescriptionFilename', uploadData.jobDescriptionFilename)
      
      // Step 2: Call the analyze API
      console.log('Calling analyze API with sessionId:', sessionId)
      
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
        signal, // Add abort signal
      })
      
      if (!analyzeResponse.ok) {
        let errorMessage = `Analysis failed with status: ${analyzeResponse.status}`;
        try {
          const errorData = await analyzeResponse.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.message) {
            errorMessage += `: ${errorData.message}`;
          }
          if (errorData.details) {
            errorMessage += ` (${errorData.details})`;
          }
          console.error('Analysis API error details:', errorData);
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const analyzeData = await analyzeResponse.json()
      
      // Verify the required fields are present with more detailed validation
      if (!analyzeData) {
        throw new Error('Server returned empty response')
      }
      
      if (!analyzeData.jobDescription) {
        console.error('Missing jobDescription in response')
      }
      
      if (!analyzeData.tailoredCV) {
        console.error('Missing tailoredCV in response')
      }
      
      if (!Array.isArray(analyzeData.improvements)) {
        console.error('Missing or invalid improvements array in response')
        analyzeData.improvements = ['CV has been tailored to match the job description']
      }
      
      // Ensure we have a valid data structure even if some parts are missing
      const validatedData = {
        ...analyzeData,
        jobDescription: analyzeData.jobDescription || 'Job description content unavailable',
        tailoredCV: analyzeData.tailoredCV || 'Tailored CV content unavailable',
        improvements: Array.isArray(analyzeData.improvements) ? analyzeData.improvements : ['CV has been tailored to match the job description'],
      }
      
      // Store the analysis results in sessionStorage
      sessionStorage.setItem('analysisResults', JSON.stringify(validatedData))
      
      // Navigate to the results page
      router.push("/results")
    } catch (error: any) {
      // Don't log console errors for user-initiated cancellations
      if (error.name !== 'AbortError' && error.message !== 'Cancelled by user') {
        console.error('Process error:', error)
      } else {
        console.log('Processing cancelled by user')
      }
      
      // Don't show error message if the request was cancelled by user
      if (error.name === 'AbortError' || error.message === 'Cancelled by user') {
        setErrorMessage('Processing cancelled')
      } else if (error.message.includes('503')) {
        // Special handling for service unavailable errors
        setErrorMessage('The CV tailoring service is temporarily unavailable. This could be due to high demand or server maintenance. Please try again in a few minutes.')
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to process your request')
      }
      
      setShowErrorBanner(true)
      setIsUploading(false)
      setIsProcessing(false)
    } finally {
      abortControllerRef.current = null
    }
  }
  
  // Handle cancellation
  const handleCancel = () => {
    try {
      if (abortControllerRef.current) {
        // Create an AbortError with a specific reason
        const reason = new DOMException('Cancelled by user', 'AbortError');
        
        // Store the current controller reference safely
        const currentController = abortControllerRef.current;
        
        // Null the reference first to prevent any race conditions
        abortControllerRef.current = null;
        
        // Abort the controller with the reason
        currentController.abort(reason);
        
        // Use console.log instead of console.error for cancellations
        console.log('Request cancelled by user');
        
        // Update UI immediately to provide feedback
        setIsProcessing(false);
        setIsUploading(false);
        setErrorMessage('Processing cancelled');
        setShowErrorBanner(true);
      }
    } catch (error: any) {
      // Only log actual errors during cancellation, not the expected abort
      if (error.name !== 'AbortError' && error.message !== 'Cancelled by user') {
        console.error('Error cancelling request:', error);
      }
      
      // Reset UI state regardless of abort result
      setIsProcessing(false);
      setIsUploading(false);
      setErrorMessage('Processing cancelled');
      setShowErrorBanner(true);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100">
      <main className="container mx-auto px-4 py-8 md:py-12 relative">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-purple-800 md:text-5xl">
              Your personal CV tailor
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-purple-700">
              Let's optimize your CV for specific job descriptions
            </p>
          </div>

          {showAlert && (
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Please upload both your CV and a job description to continue.
              </AlertDescription>
            </Alert>
          )}
          
          {showErrorBanner && errorMessage && (
            <div className="bg-red-50 border border-red-100 rounded-md p-4 mb-6 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="flex-grow">
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700">{errorMessage}</p>
              </div>
              <button 
                onClick={() => setShowErrorBanner(false)} 
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 h-full">
            <div className="file-upload-wrapper">
              <FileUploader
                label="Upload Your CV"
                acceptedFileTypes=".docx,.txt"
                description="Drag and drop your CV file"
                onUploadStateChange={setHasCv}
                onFileSelected={setCvFile}
                name="cv"
                disabled={isProcessing}
              />
            </div>

            <div className="file-upload-wrapper">
              <FileUploader
                label="Upload Job Description"
                acceptedFileTypes=".docx,.txt"
                description="Drag and drop a job description file"
                allowTextPaste
                onUploadStateChange={setHasJobDescription}
                onFileSelected={setJobDescriptionFile}
                onTextEntered={setJobDescriptionText}
                name="jobDescription"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            {isProcessing ? (
              // Processing state UI
              <div className="flex flex-row items-center gap-4">
                <Button
                  size="lg"
                  className="gap-2 bg-purple-800 px-8 py-4 text-lg font-medium hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={true}
                >
                  <Loader2 className="mr-1 h-5 w-5 animate-spin" />
                  Tailoring your CV...
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleCancel}
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            ) : (
              // Default button state
              <Button
                size="lg"
                className="gap-2 bg-purple-800 px-8 py-4 text-lg font-medium hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleTailorCV}
                disabled={isProcessing || !hasCv || !hasJobDescription}
              >
                <PencilIcon className="mr-1 h-5 w-5" />
                Tailor CV
                <ArrowRight className="h-5 w-5" />
              </Button>
            )}

            <p className="mt-3 text-center text-sm text-purple-600">
              {isProcessing 
                ? `Please wait while we tailor your CV to the job description... (~${estimatedTime} ${estimatedTime === 1 ? 'second' : 'seconds'} remaining)` 
                : "Please upload your CV and provide a job description to continue"}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

