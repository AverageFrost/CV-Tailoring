"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from "lucide-react"

export default function ProcessingLoading() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the home page since we no longer use the processing page
    router.push('/')
  }, [router])

  return null
}

