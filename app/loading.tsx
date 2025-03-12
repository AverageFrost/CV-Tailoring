import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-800" />
        <h2 className="text-xl font-semibold text-purple-800">Loading CV Tailoring Tool...</h2>
        <p className="text-purple-600">Please wait while we set things up</p>
      </div>
    </div>
  )
}

