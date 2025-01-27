'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function NewSessionPage() {
  const router = useRouter()

  useEffect(() => {
    const createSession = async () => {
      try {
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) {
          throw new Error('Failed to create session')
        }

        const session = await response.json()
        router.push(`/session/${session.id}`)
      } catch (error) {
        console.error('Error creating session:', error)
        // TODO: Add error handling UI
      }
    }

    createSession()
  }, [])

  return <div>Creating new session...</div>
}
