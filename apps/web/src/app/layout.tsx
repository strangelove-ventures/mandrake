import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"
import { Toaster } from "@/components/ui/toaster"
import '@/lib/mcp';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mandrake",
  description: "AI Assistant Platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Toaster />
        </div>
      </body>
    </html>
  )
}