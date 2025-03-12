"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProcessingPage() {
  const router = useRouter()

  // Redirect to the home page since we're no longer using this page
  useEffect(() => {
    router.push("/")
  }, [router])

  return null
}

