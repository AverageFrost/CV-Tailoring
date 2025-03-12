import type React from "react"
export function MeasuringTapeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19.875 12c.621 0 1.125.512 1.125 1.143v5.714c0 .631-.504 1.143-1.125 1.143H4.125C3.504 20 3 19.488 3 18.857v-5.714C3 12.512 3.504 12 4.125 12h15.75z" />
      <path d="M9 12V9" />
      <path d="M6 12v-1.5" />
      <path d="M12 12V9" />
      <path d="M15 12v-1.5" />
      <path d="M18 12V9" />
      <path d="M21 12V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v3" />
    </svg>
  )
}

