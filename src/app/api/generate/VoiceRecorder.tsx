"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Globe } from "lucide-react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  onListeningChange: (listening: boolean) => void;
  isListening: boolean;
}

// Supported languages with their codes
const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
  { code: 'nl-NL', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv-SE', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no-NO', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da-DK', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi-FI', name: 'Finnish', flag: '🇫🇮' },
  { code: 'pl-PL', name: 'Polish', flag: '🇵🇱' },
  { code: 'tr-TR', name: 'Turkish', flag: '🇹🇷' }
];

export default function VoiceRecorder({
  onTranscript,
  onError,
  onListeningChange,
  isListening,
}: VoiceRecorderProps) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isAutoDetect, setIsAutoDetect] = useState(true);
  const [isHttpsSecure, setIsHttpsSecure] = useState(true);
  const [micPermission, setMicPermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(true);
  const [isMicrophoneAvailable, setIsMicrophoneAvailable] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetriesRef = useRef(3);
  const networkErrorCountRef = useRef(0);
  const maxNetworkErrorsRef = useRef(2);
  const micStreamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setBrowserSupportsSpeechRecognition(false);
      onError("Speech recognition is not supported. Please use Chrome, Edge, or Safari.");
      return;
    }

    // Check HTTPS
    if (typeof window !== "undefined") {
      const isSecure =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      setIsHttpsSecure(isSecure);

      if (!isSecure) {
        onError("⚠️ Voice recognition requires HTTPS. Please access this site using https://");
        return;
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLanguage;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started");
      setListening(true);
      setIsRetrying(false);
      retryCountRef.current = 0;
      onListeningChange(true);
      onError("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptChunk + " ";
        } else {
          interimTranscript += transcriptChunk;
        }
      }

      const fullTranscript = finalTranscript + interimTranscript;
      setTranscript(fullTranscript);
      onTranscript(fullTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      
      let errorMsg = "";
      let shouldStop = false;

      switch (event.error) {
        case "no-speech":
          console.log("No speech detected, will retry...");
          return; // Don't show error, just retry
          
        case "aborted":
          console.log("Recognition aborted by user");
          return;
          
        case "audio-capture":
          errorMsg = "❌ No microphone found. Please connect a microphone.";
          shouldStop = true;
          break;
          
        case "not-allowed":
          errorMsg = "🚫 Microphone access denied. Please allow access in settings.";
          setMicPermission("denied");
          setIsMicrophoneAvailable(false);
          shouldStop = true;
          break;
          
        case "network":
          networkErrorCountRef.current += 1;
          console.error(`Network error ${networkErrorCountRef.current}/${maxNetworkErrorsRef.current}`);
          
          if (networkErrorCountRef.current >= maxNetworkErrorsRef.current) {
            errorMsg = "🌐 Network Error: Unable to connect to speech service. Please check:\n• Your internet connection is working\n• You're using HTTPS (not HTTP)\n• Try refreshing the page";
            shouldStop = true;
          } else {
            // Don't show error yet, will retry
            console.log("Network error, will retry...");
            return;
          }
          break;
          
        case "service-not-allowed":
          errorMsg = "🔒 Speech service not allowed. Make sure you're using HTTPS.";
          shouldStop = true;
          break;
          
        default:
          errorMsg = `Error: ${event.error}`;
          shouldStop = true;
      }

      if (shouldStop) {
        onError(errorMsg);
        setListening(false);
        onListeningChange(false);
        shouldListenRef.current = false;
        setIsRetrying(false);
      }
    };

    recognition.onend = () => {
      console.log("🛑 Speech recognition ended");
      setListening(false);
      onListeningChange(false);

      // Clear any pending restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      // Auto-restart if user didn't stop it and we haven't hit max retries
      if (shouldListenRef.current && retryCountRef.current < maxRetriesRef.current) {
        retryCountRef.current += 1;
        setIsRetrying(true);
        
        // Use exponential backoff for retries
        const delay = Math.min(1000 * retryCountRef.current, 3000);
        console.log(`🔄 Scheduling restart attempt ${retryCountRef.current}/${maxRetriesRef.current} in ${delay}ms...`);
        
        restartTimeoutRef.current = setTimeout(() => {
          if (shouldListenRef.current) {
            try {
              console.log("🔄 Attempting to restart recognition...");
              recognition.start();
            } catch (error) {
              console.error("Failed to restart recognition:", error);
              setIsRetrying(false);
              if (retryCountRef.current >= maxRetriesRef.current) {
                onError("Voice recognition stopped after multiple attempts. Please click the microphone to try again.");
                shouldListenRef.current = false;
              }
        }
      } else {
            setIsRetrying(false);
          }
        }, delay);
      } else {
        setIsRetrying(false);
        retryCountRef.current = 0;
        if (retryCountRef.current >= maxRetriesRef.current) {
          onError("Voice recognition stopped after multiple attempts. Please click the microphone to try again.");
        }
      }
    };

    recognitionRef.current = recognition;

    // Check microphone permission
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          setMicPermission(permissionStatus.state as any);
          setIsMicrophoneAvailable(permissionStatus.state !== "denied");

          permissionStatus.onchange = () => {
            const newState = permissionStatus.state as any;
            setMicPermission(newState);
            setIsMicrophoneAvailable(newState !== "denied");

            if (newState === "denied") {
              onError("Microphone access was denied. Please enable it in your browser settings.");
            } else if (newState === "granted") {
              onError("");
            }
          };
        }
      } catch (error) {
        console.log("Permission API not available:", error);
      }
    };

    checkPermission();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log("✅ Back online");
      networkErrorCountRef.current = 0; // Reset network errors when back online
    };

    const handleOffline = () => {
      console.log("❌ Gone offline");
      if (shouldListenRef.current) {
        onError("❌ Lost internet connection. Voice recognition requires internet access.");
        // Stop listening
        shouldListenRef.current = false;
        setIsRetrying(false);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.log("Error stopping on offline:", e);
          }
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      // Clear any pending restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Remove event listeners
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedLanguage, onError, onTranscript, onListeningChange]);

  // Request microphone permission explicitly
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;
      setMicPermission("granted");
      setIsMicrophoneAvailable(true);
      onError("");
      return true;
    } catch (error: any) {
      console.error("Microphone access error:", error);

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setMicPermission("denied");
        setIsMicrophoneAvailable(false);
        onError("🚫 Microphone access denied. Please click 'Allow' when prompted, or enable microphone in your browser settings.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        onError("❌ No microphone found. Please connect a microphone and try again.");
      } else if (error.name === "NotReadableError") {
        onError("⚠️ Microphone is already in use by another application. Please close other apps and try again.");
      } else if (error.name === "SecurityError") {
        onError("🔒 Security error: Microphone access requires HTTPS or localhost.");
      } else {
        onError(`❌ Could not access microphone: ${error.message || error.name || "Unknown error"}`);
      }

      return false;
    }
  };

  // Start listening with selected language
  const startListening = async () => {
    if (!browserSupportsSpeechRecognition) {
      onError("Speech recognition is not supported. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (!isHttpsSecure) {
      onError("Voice recognition requires HTTPS. Please access this site using https://");
      return;
    }

    // Request microphone permission
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      return;
    }

    if (recognitionRef.current) {
      // Clear any pending restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Update language if changed
      const language = isAutoDetect ? 'en-US' : selectedLanguage;
      recognitionRef.current.lang = language;
      
      shouldListenRef.current = true;
      retryCountRef.current = 0;
      networkErrorCountRef.current = 0; // Reset network error count
      setIsRetrying(false);
      
      try {
        recognitionRef.current.start();
      } catch (error: any) {
        console.error("Failed to start recognition:", error);
        if (error.name === "InvalidStateError") {
          onError("Recognition is already running. Please wait.");
        } else {
          onError(`Failed to start voice recognition: ${error.message || "Please try again"}`);
        }
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    shouldListenRef.current = false;
    setIsRetrying(false);
    
    // Clear any pending restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }

    // Stop and release microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  };

  // Reset transcript
  const resetTranscript = () => {
    setTranscript("");
    onTranscript("");
  };

  // Show error if HTTPS is not enabled
  if (!isHttpsSecure) {
    return (
      <div className="bg-red-50 rounded-2xl p-6 text-center">
        <p className="text-red-700 font-bold mb-2">🔒 HTTPS Required</p>
        <p className="text-red-600 text-sm">
          Voice recognition requires a secure connection (HTTPS).
        </p>
        <p className="text-gray-700 text-xs mt-2">
          Please access this site using <strong>https://</strong> instead of http://
        </p>
      </div>
    );
  }

  // Show error if browser doesn't support voice recognition
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="bg-red-50 rounded-2xl p-6 text-center">
        <p className="text-red-700 font-bold mb-2">❌ Not Supported</p>
        <p className="text-red-600 text-sm">
          Your browser doesn't support voice recognition.
        </p>
        <p className="text-gray-700 text-xs mt-2">
          Please use <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Safari</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
        <div className="flex flex-col items-center gap-4">
          {/* Language Selection */}
          <div className="w-full">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={20} className="text-purple-600" />
              <p className="text-purple-600 font-bold text-sm">Language / மொழி</p>
            </div>
            
            {/* Auto-detect toggle */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="autoDetect"
                checked={isAutoDetect}
                onChange={(e) => setIsAutoDetect(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="autoDetect" className="text-sm text-gray-700">
                Auto-detect language / தானியங்கு மொழி கண்டறிதல்
              </label>
            </div>

            {/* Language dropdown */}
            {!isAutoDetect && (
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            )}

            {/* Current language display */}
            {isAutoDetect && (
              <div className="p-2 bg-purple-50 rounded-lg text-sm text-purple-700">
                🌍 Auto-detecting language (English default)
              </div>
            )}
          </div>

          {/* Status and controls */}
          <div className="text-center">
            <p className="text-purple-600 font-bold text-lg mb-2">
              {isRetrying
                ? "🔄 Reconnecting..."
                : listening
                ? "🎤 Listening..."
                : "🎙️ Voice Input"}
            </p>
            <p className="text-purple-500 text-sm">
              {isRetrying
                ? "Restarting voice recognition, please wait..."
                : listening
                ? "Keep talking! I'm recording your voice."
                : "Click the microphone to start speaking."}
            </p>
          </div>

          {/* Microphone button */}
          <button
            onClick={listening ? stopListening : startListening}
            disabled={(micPermission === "denied" && !listening) || isRetrying}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-lg transition-all duration-300 transform hover:scale-110 ${
              isRetrying
                ? "bg-gradient-to-br from-yellow-500 to-orange-500 animate-pulse shadow-lg cursor-not-allowed"
                : listening
                ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse shadow-lg"
                : micPermission === "denied"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
            }`}
          >
            {isRetrying ? (
              <div className="animate-spin">🔄</div>
            ) : listening ? (
              <Square size={32} />
            ) : (
              <Mic size={32} />
            )}
          </button>

            <p className="text-purple-600 text-sm font-medium">
            {isRetrying 
              ? "Please wait..." 
              : listening 
              ? "Tap to stop recording" 
              : "Tap to start speaking"}
          </p>

          {/* Transcript display */}
          {transcript && (
            <div className="w-full p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">What you said:</p>
              <p className="text-gray-800 font-medium">{transcript}</p>
              <button
                onClick={resetTranscript}
                className="mt-2 text-xs text-purple-600 hover:text-purple-800 underline"
              >
                Clear text
              </button>
            </div>
          )}

          {/* Microphone permission status */}
          {micPermission === "denied" && (
            <div className="w-full bg-red-50 rounded-xl p-3 text-sm">
              <p className="font-bold text-red-700 mb-2">
                🚫 Microphone Access Denied
              </p>
              <p className="text-red-600 text-xs">
                Please enable microphone access in your browser settings to use voice input.
            </p>
          </div>
          )}
        </div>
      </div>

      {/* Sound wave animation */}
      {(listening || isRetrying) && (
        <div className="flex gap-2 justify-center">
          <div className={`w-3 h-6 rounded-full animate-bounce ${
            isRetrying 
              ? "bg-gradient-to-t from-yellow-500 to-orange-400" 
              : "bg-gradient-to-t from-purple-500 to-purple-400"
          }`} />
          <div
            className={`w-3 h-8 rounded-full animate-bounce ${
              isRetrying 
                ? "bg-gradient-to-t from-yellow-400 to-orange-300" 
                : "bg-gradient-to-t from-purple-400 to-purple-300"
            }`}
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className={`w-3 h-6 rounded-full animate-bounce ${
              isRetrying 
                ? "bg-gradient-to-t from-yellow-300 to-orange-200" 
                : "bg-gradient-to-t from-purple-300 to-purple-200"
            }`}
            style={{ animationDelay: "0.4s" }}
          />
          <div
            className={`w-3 h-8 rounded-full animate-bounce ${
              isRetrying 
                ? "bg-gradient-to-t from-yellow-200 to-orange-100" 
                : "bg-gradient-to-t from-purple-200 to-purple-100"
            }`}
            style={{ animationDelay: "0.6s" }}
          />
          <div
            className={`w-3 h-6 rounded-full animate-bounce ${
              isRetrying 
                ? "bg-gradient-to-t from-yellow-100 to-white" 
                : "bg-gradient-to-t from-purple-100 to-white"
            }`}
            style={{ animationDelay: "0.8s" }}
          />
        </div>
      )}
    </div>
  );
}
