"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square } from "lucide-react"

interface VoiceRecorderProps {
  onTranscript: (text: string) => void
  onError: (error: string) => void
  onListeningChange: (listening: boolean) => void
  isListening: boolean
}

export default function VoiceRecorder({ onTranscript, onError, onListeningChange, isListening }: VoiceRecorderProps) {
  const recognitionRef = useRef<any>(null)
  const [isBrowserSupported, setIsBrowserSupported] = useState(true)
  const shouldListenRef = useRef(false)
  const retryCountRef = useRef(0)
  const maxRetriesRef = useRef(3)
  const isStoppingRef = useRef(false)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsBrowserSupported(false)
      onError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log("[v0] Speech recognition started")
      retryCountRef.current = 0
      onListeningChange(true)
      onError("")
    }

    recognition.onresult = (event: any) => {
      console.log("[v0] Speech result received:", event.results.length)
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " "
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        console.log("[v0] Final transcript:", finalTranscript)
        onTranscript(finalTranscript)
      } else if (interimTranscript) {
        console.log("[v0] Interim transcript:", interimTranscript)
        onTranscript(interimTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      console.log("[v0] Speech recognition error:", event.error)
      let errorMessage = "An error occurred"

      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech detected. Please speak louder or closer to the microphone."
          if (retryCountRef.current < maxRetriesRef.current && shouldListenRef.current) {
            console.log("[v0] Retrying... Attempt", retryCountRef.current + 1)
            retryCountRef.current += 1
            setTimeout(() => {
              try {
                recognition.start()
              } catch (e) {
                console.log("[v0] Error restarting recognition:", e)
              }
            }, 500)
            return
          }
          break
        case "audio-capture":
          errorMessage = "No microphone found. Please check your device and refresh the page."
          break
        case "network":
          errorMessage = "Network error. Please check your connection."
          break
        case "not-allowed":
          errorMessage = "Microphone permission denied. Please allow access in your browser settings."
          break
        default:
          errorMessage = `Error: ${event.error}`
      }

      onError(errorMessage)
      if (!shouldListenRef.current || isStoppingRef.current) {
        onListeningChange(false)
      }
    }

    recognition.onend = () => {
      console.log(
        "[v0] Speech recognition ended, shouldListen:",
        shouldListenRef.current,
        "isStopping:",
        isStoppingRef.current,
      )
      if (shouldListenRef.current && !isStoppingRef.current) {
        try {
          console.log("[v0] Restarting recognition...")
          recognition.start()
        } catch (e) {
          console.log("[v0] Recognition already started, ignoring error")
        }
      } else {
        console.log("[v0] Not restarting - user stopped or stopping flag set")
        onListeningChange(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [onTranscript, onError, onListeningChange])

  const startListening = () => {
    if (recognitionRef.current && isBrowserSupported) {
      console.log("[v0] Starting listening...")
      shouldListenRef.current = true
      isStoppingRef.current = false
      retryCountRef.current = 0
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.log("[v0] Error starting recognition:", e)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      console.log("[v0] Stopping listening...")
      shouldListenRef.current = false
      isStoppingRef.current = true // Set stopping flag
      try {
        recognitionRef.current.abort()
      } catch (e) {
        console.log("[v0] Error stopping recognition:", e)
      }
      onListeningChange(false)
    }
  }

  if (!isBrowserSupported) {
    return (
      <div className="bg-red-100 border-2 border-red-400 rounded-2xl p-6 text-center">
        <p className="text-red-700 font-semibold">
          Your browser doesn't support voice recognition. Please use Chrome, Edge, or Safari.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-purple-700 font-bold text-lg mb-2">
              {isListening ? "Listening..." : "Ready to listen!"}
            </p>
            <p className="text-purple-600 text-sm">
              {isListening ? "Keep talking! I'm recording your voice." : "Click the microphone button to start."}
            </p>
          </div>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center font-bold text-white text-lg transition-all duration-300 ${
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse-glow"
                : "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl"
            }`}
          >
            {isListening ? <Square size={40} className="fill-white" /> : <Mic size={40} />}
          </button>

          <div className="text-center">
            <p className="text-purple-600 text-sm font-medium">
              {isListening ? "Tap the red button to stop" : "Tap the button to start speaking"}
            </p>
          </div>
        </div>
      </div>

      {isListening && (
        <div className="flex gap-2 justify-center">
          <div className="w-2 h-8 bg-purple-500 rounded-full animate-bounce-gentle" style={{ animationDelay: "0s" }} />
          <div className="w-2 h-8 bg-pink-500 rounded-full animate-bounce-gentle" style={{ animationDelay: "0.2s" }} />
          <div
            className="w-2 h-8 bg-orange-500 rounded-full animate-bounce-gentle"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      )}
    </div>
  )
}
