"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, File, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  label: string
  acceptedFileTypes: string
  description: string
  allowTextPaste?: boolean
  onUploadStateChange?: (hasContent: boolean) => void
  onFileSelected?: (file: File | null) => void
  onTextEntered?: (text: string) => void
  name?: string
  disabled?: boolean
}

export function FileUploader({
  label,
  acceptedFileTypes,
  description,
  allowTextPaste = false,
  onUploadStateChange,
  onFileSelected,
  onTextEntered,
  name,
  disabled = false
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [uploadMethod, setUploadMethod] = useState<"file" | "text" | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Notify parent component when upload state changes
  useEffect(() => {
    const hasContent = !!file || !!pastedText
    if (onUploadStateChange) {
      onUploadStateChange(hasContent)
    }
    
    // Notify parent about file changes
    if (onFileSelected && file !== null) {
      onFileSelected(file)
    }
    
    // Notify parent about text changes
    if (onTextEntered && pastedText) {
      onTextEntered(pastedText)
    }
  }, [file, pastedText, onUploadStateChange, onFileSelected, onTextEntered])

  // Helper function to validate file type
  const validateFileType = (file: File): boolean => {
    const allowedTypes = acceptedFileTypes.split(',');
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    return allowedTypes.includes(fileExtension);
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return
    
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setFileError(null)
    console.log("File dropped", e.dataTransfer.files)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      console.log("Handling dropped file:", droppedFile.name)
      
      if (validateFileType(droppedFile)) {
        setFile(droppedFile)
        setUploadMethod("file")
        setPastedText("")
      } else {
        setFileError(`Invalid file type. Please upload only ${acceptedFileTypes.replace(/\./g, "").toUpperCase()} files.`)
        setFile(null)
        setUploadMethod(null)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    
    setFileError(null)
    console.log("File input change", e.target.files)
    
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      console.log("Handling selected file:", selectedFile.name)
      
      if (validateFileType(selectedFile)) {
        setFile(selectedFile)
        setUploadMethod("file")
        setPastedText("")
      } else {
        setFileError(`Invalid file type. Please upload only ${acceptedFileTypes.replace(/\./g, "").toUpperCase()} files.`)
        setFile(null)
        setUploadMethod(null)
        
        // Reset the input field
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return
    
    setPastedText(e.target.value)
    setFileError(null)
    if (e.target.value) {
      setUploadMethod("text")
      setFile(null)
    } else {
      setUploadMethod(null)
    }
  }

  const handleRemoveFile = () => {
    if (disabled) return
    
    setFile(null)
    setUploadMethod(null)
    setFileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveText = () => {
    if (disabled) return
    
    setPastedText("")
    setUploadMethod(null)
    setFileError(null)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return
    
    e.preventDefault()
    console.log("File uploader clicked, triggering file input click")
    if (fileInputRef.current) {
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      fileInputRef.current.dispatchEvent(clickEvent);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-purple-200 bg-white p-4 shadow-sm relative z-10 file-uploader-fix file-uploader-container">
      <h2 className="mb-3 text-xl font-semibold text-purple-800">{label}</h2>

      {!uploadMethod && (
        <>
          <label 
            htmlFor={`file-input-${name}`}
            className={cn(
              "flex min-h-[160px] flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-purple-200 p-6 transition-colors relative z-50",
              isDragging && "border-primary bg-primary/5",
              fileError && "border-red-300",
              disabled && "opacity-60 cursor-not-allowed"
            )}
            onDragOver={!disabled ? handleDragOver : undefined}
            onDragLeave={!disabled ? handleDragLeave : undefined}
            onDrop={!disabled ? handleDrop : undefined}
            onClick={!disabled ? handleClick : undefined}
            style={{ pointerEvents: disabled ? 'none' : 'auto' }}
            data-drag-target="true"
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Click to select ${label} file`}
            aria-disabled={disabled}
            onKeyDown={!disabled ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick(e as unknown as React.MouseEvent)
              }
            } : undefined}
          >
            <Upload className="mb-3 h-8 w-8 text-purple-400" />
            <p className="mb-1 text-center text-sm font-medium text-purple-700">{description}</p>
            <p className="text-center text-xs text-purple-500">
              Accepted file types: {acceptedFileTypes.replace(/\./g, "").toUpperCase()}
            </p>
            <input
              id={`file-input-${name}`}
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={acceptedFileTypes}
              onChange={handleFileChange}
              name={name}
              aria-label={`Upload ${label}`}
              disabled={disabled}
            />
          </label>
          
          {fileError && (
            <div className="mt-2 flex items-center text-red-600 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>{fileError}</span>
            </div>
          )}
          
          {allowTextPaste && (
            <div className="mt-2 flex flex-col">
              <p className="mb-1 text-sm font-medium text-purple-700">Or paste text directly:</p>
              <div className="textarea-container">
                <Textarea
                  value={pastedText}
                  onChange={handleTextChange}
                  className="resize-none border-purple-200 focus-visible:ring-purple-800 textarea-fixed-height placeholder:text-purple-500 placeholder:text-xs"
                  placeholder="Paste job description here..."
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </>
      )}

      {uploadMethod === "file" && file && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-purple-200 bg-purple-50 p-6 file-preview-container h-full">
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <File className="mb-3 h-8 w-8 text-primary" />
            <p className="mb-1 text-center font-medium text-purple-800">{file.name}</p>
            <p className="mb-3 text-center text-sm text-purple-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {disabled ? (
            <button
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background h-9 rounded-md px-3 gap-1 opacity-50 cursor-default"
              disabled={true}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveFile()
              }}
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      )}

      {allowTextPaste && uploadMethod === "text" && (
        <div className="flex-1 flex flex-col rounded-lg border border-purple-200 bg-purple-50 p-4 file-preview-container h-full">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-purple-700">Pasted Text</p>
            {disabled ? (
              <button
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-8 px-2 gap-1 text-purple-500 opacity-50 cursor-default"
                disabled={true}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-purple-500 hover:text-purple-700"
                onClick={handleRemoveText}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
          <div className="flex-1 textarea-container h-full">
            <Textarea
              value={pastedText}
              onChange={handleTextChange}
              className="h-full w-full resize-none border-purple-200 focus-visible:ring-purple-800 textarea-fixed-height"
              placeholder="Paste job description here..."
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  )
}

