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
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const shouldListenRef = useRef(false)
  const retryCountRef = useRef(0)
  const maxRetriesRef = useRef(3)
  const isStoppingRef = useRef(false)
  const micStreamRef = useRef<MediaStream | null>(null)

  // Check microphone permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          setMicPermission(permissionStatus.state as 'prompt' | 'granted' | 'denied')
          
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state as 'prompt' | 'granted' | 'denied')
          }
        }
      } catch (error) {
        console.log("[v0] Permission API not supported, will request on use")
      }
    }
    
    checkPermission()
  }, [])

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
      // Clean up microphone stream on unmount
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop())
        micStreamRef.current = null
      }
    }
  }, [onTranscript, onError, onListeningChange])

  const requestMicrophonePermission = async () => {
    try {
      console.log("[v0] Requesting microphone permission...")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log("[v0] Microphone permission granted")
      micStreamRef.current = stream
      setMicPermission('granted')
      return true
    } catch (error: any) {
      console.log("[v0] Microphone permission error:", error)
      setMicPermission('denied')
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        onError("Microphone access denied. Please click the microphone button again and allow access when prompted.")
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        onError("No microphone found. Please connect a microphone and try again.")
      } else {
        onError("Could not access microphone. Please check your browser settings.")
      }
      return false
    }
  }

  const startListening = async () => {
    if (!recognitionRef.current || !isBrowserSupported) return

    console.log("[v0] Starting listening...")
    
    // First, request microphone permission
    const hasPermission = await requestMicrophonePermission()
    
    if (!hasPermission) {
      console.log("[v0] No microphone permission, cannot start")
      return
    }

    shouldListenRef.current = true
    isStoppingRef.current = false
    retryCountRef.current = 0
    onError("") // Clear any previous errors
    
    try {
      recognitionRef.current.start()
    } catch (e) {
      console.log("[v0] Error starting recognition:", e)
      onError("Failed to start voice recognition. Please try again.")
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      console.log("[v0] Stopping listening...")
      shouldListenRef.current = false
      isStoppingRef.current = true
      try {
        recognitionRef.current.abort()
      } catch (e) {
        console.log("[v0] Error stopping recognition:", e)
      }
      
      // Stop microphone stream
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop())
        micStreamRef.current = null
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
              {isListening ? "🎤 Listening..." : "🎙️ Voice Input"}
            </p>
            <p className="text-purple-600 text-sm">
              {isListening ? "Keep talking! I'm recording your voice." : "Click the microphone to speak your idea"}
            </p>
          </div>

          <button
            onClick={isListening ? stopListening : startListening}
            disabled={micPermission === 'denied' && !isListening}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center font-bold text-white text-lg transition-all duration-300 ${
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse-glow"
                : micPermission === 'denied'
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl hover:scale-105"
            }`}
          >
            {isListening ? <Square size={40} className="fill-white" /> : <Mic size={40} />}
          </button>

          <div className="text-center">
            <p className="text-purple-600 text-sm font-medium">
              {isListening ? "Tap to stop recording" : "Tap to start speaking"}
            </p>
          </div>

          {/* Permission Status and Instructions */}
          {!isListening && (
            <>
              {micPermission === 'denied' && (
                <div className="w-full bg-red-50 border-2 border-red-300 rounded-xl p-4 text-sm">
                  <p className="font-bold text-red-700 mb-2">🚫 Microphone Access Blocked</p>
                  <p className="text-gray-700 mb-3">To use voice input, you need to enable microphone access:</p>
                  <div className="bg-white rounded-lg p-3 text-left space-y-2 text-xs">
                    <p className="font-semibold text-gray-800">📱 On Mobile:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                      <li>Go to your phone Settings</li>
                      <li>Find your browser (Chrome/Safari)</li>
                      <li>Enable Microphone permission</li>
                      <li>Refresh this page and try again</li>
                    </ul>
                    <p className="font-semibold text-gray-800 mt-3">💻 On Desktop:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                      <li>Click the 🔒 lock icon in address bar</li>
                      <li>Find "Microphone" setting</li>
                      <li>Change to "Allow"</li>
                      <li>Refresh and try again</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {micPermission === 'prompt' && (
                <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-xs">
                  <p className="font-semibold text-blue-700 mb-1">💡 Tip:</p>
                  <p className="text-gray-700">
                    When you click the microphone, your browser will ask for permission. 
                    Click <strong>"Allow"</strong> to use voice input.
                  </p>
                </div>
              )}
              
              {micPermission === 'granted' && (
                <div className="w-full bg-green-50 border-2 border-green-200 rounded-xl p-3 text-xs">
                  <p className="font-semibold text-green-700 mb-1">✅ Microphone Ready</p>
                  <p className="text-gray-700">
                    Click the button above and start speaking your coloring page idea!
                  </p>
                </div>
              )}
            </>
          )}
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
