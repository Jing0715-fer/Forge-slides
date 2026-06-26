"use client"

import dynamic from "next/dynamic"

const Editor = dynamic(() => import("@/components/editor/Editor").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold animate-pulse">S</div>
        <p className="text-sm text-muted-foreground">Loading SlideForge…</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return <Editor />
}
