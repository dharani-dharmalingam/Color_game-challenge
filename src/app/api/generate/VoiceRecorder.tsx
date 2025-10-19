"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  onListeningChange: (listening: boolean) => void;
  isListening: boolean;
}

export default function VoiceRecorder({
  onTranscript,
  onError,
  onListeningChange,
  isListening,
}: VoiceRecorderProps) {
  const recognitionRef = useRef<any>(null);
  const [isBrowserSupported, setIsBrowserSupported] = useState(true);
  const [isHttpsSecure, setIsHttpsSecure] = useState(true);
  const [micPermission, setMicPermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [isRetrying, setIsRetrying] = useState(false);

  const shouldListenRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetriesRef = useRef(10); // Max auto-restart attempts
  const isStoppingRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReceivedSpeechRef = useRef(false); // Track if we've received any speech

  // ✅ Check HTTPS and browser support on mount
  useEffect(() => {
    // Check if served over HTTPS (or localhost)
    if (typeof window !== "undefined") {
      const isSecure =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      setIsHttpsSecure(isSecure);

      if (!isSecure) {
        onError(
          "⚠️ Voice recognition requires HTTPS. Please access this site using https://"
        );
        return;
      }
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsBrowserSupported(false);
      onError(
        "Microphone access not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    // Check microphone permission status
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          setMicPermission(permissionStatus.state as any);

          // Listen for permission changes
          permissionStatus.onchange = () => {
            const newState = permissionStatus.state as any;
            console.log("[v0] Mic permission changed to:", newState);
            setMicPermission(newState);

            if (newState === "denied") {
              onError(
                "Microphone access was denied. Please enable it in your browser settings."
              );
              // Stop listening if currently active
              if (shouldListenRef.current && recognitionRef.current) {
                shouldListenRef.current = false;
                isStoppingRef.current = true;
                try {
                  recognitionRef.current.abort();
                } catch (e) {
                  console.log("[v0] Error stopping on permission change:", e);
                }
                onListeningChange(false);
              }
            } else if (newState === "granted") {
              onError(""); // Clear error
            }
          };
        }
      } catch (error) {
        console.log("[v0] Permission API not available:", error);
        // Permission API not supported, will handle on getUserMedia call
      }
    };

    checkPermission();
  }, [onError]);

  // ✅ Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsBrowserSupported(false);
      onError(
        "Speech recognition is not supported. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("[v0] ✅ Speech recognition started successfully");
      retryCountRef.current = 0; // Reset retry counter on successful start
      hasReceivedSpeechRef.current = false;
      setIsRetrying(false); // Clear retrying state
      onListeningChange(true);
      onError("");
    };

    recognition.onresult = (event: any) => {
      console.log("[v0] 🎤 Speech detected, processing results...");
      hasReceivedSpeechRef.current = true; // Mark that we've received speech
      retryCountRef.current = 0; // Reset retry counter when speech is detected
      
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
          console.log("[v0] Final:", finalTranscript);
        } else {
          interimTranscript += transcript;
          console.log("[v0] Interim:", interimTranscript);
        }
      }

      if (finalTranscript) onTranscript(finalTranscript);
      else if (interimTranscript) onTranscript(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.log("[v0] Speech error:", event.error);
      let errorMsg = "An error occurred";

      switch (event.error) {
        case "no-speech":
          errorMsg = "No speech detected. Please speak louder or closer.";
          break;
        case "audio-capture":
          errorMsg = "No microphone found. Please check your device.";
          break;
        case "not-allowed":
          errorMsg =
            "Microphone permission denied. Please allow access in settings.";
          setMicPermission("denied");
          break;
        default:
          errorMsg = event.error;
      }

      onError(errorMsg);
      if (!shouldListenRef.current || isStoppingRef.current) {
        onListeningChange(false);
      }
    };

    recognition.onend = () => {
      console.log(
        "[v0] 🛑 Speech recognition ended. shouldListen:",
        shouldListenRef.current,
        "isStopping:",
        isStoppingRef.current,
        "retryCount:",
        retryCountRef.current,
        "hasReceivedSpeech:",
        hasReceivedSpeechRef.current
      );

      // Clear any pending restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      // If user stopped or we've hit max retries, don't restart
      if (!shouldListenRef.current || isStoppingRef.current) {
        console.log("[v0] Not restarting - user stopped");
        onListeningChange(false);
        return;
      }

      // Check retry limit
      if (retryCountRef.current >= maxRetriesRef.current) {
        console.log("[v0] ⚠️ Max restart attempts reached. Stopping.");
        shouldListenRef.current = false;
        onError(
          "Voice recognition stopped after multiple attempts. Please click the microphone to try again."
        );
        onListeningChange(false);
        return;
      }

      // Restart with exponential backoff delay
      retryCountRef.current += 1;
      const delay = Math.min(1000 * retryCountRef.current, 3000); // Max 3 second delay
      
      console.log(
        `[v0] 🔄 Scheduling restart attempt ${retryCountRef.current}/${maxRetriesRef.current} in ${delay}ms...`
      );

      setIsRetrying(true); // Show user we're retrying

      restartTimeoutRef.current = setTimeout(() => {
        if (shouldListenRef.current && !isStoppingRef.current) {
          try {
            console.log("[v0] Attempting to restart recognition...");
            recognition.start();
          } catch (error: any) {
            console.error("[v0] Failed to restart:", error);
            setIsRetrying(false);
            
            if (error.name === "InvalidStateError") {
              // Already running, ignore
              console.log("[v0] Recognition already running");
              setIsRetrying(false);
            } else {
              onError(
                "Failed to restart voice recognition. Please click the microphone button again."
              );
              shouldListenRef.current = false;
              onListeningChange(false);
            }
          }
        } else {
          setIsRetrying(false);
        }
      }, delay);
    };

    recognitionRef.current = recognition;

    return () => {
      // Cleanup on unmount
      console.log("[v0] Cleaning up recognition...");
      
      // Clear any pending restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Stop recognition
      try {
        recognition.abort();
      } catch (e) {
        console.log("[v0] Error aborting on cleanup:", e);
      }
      
      // Stop microphone stream
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
    };
  }, [onTranscript, onError, onListeningChange]);

  // ✅ Request mic permission explicitly (must be called from user gesture)
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      console.log("[v0] Requesting microphone access...");

      // Request microphone access - this MUST be triggered by user gesture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("[v0] Microphone access granted!");
      micStreamRef.current = stream;
      setMicPermission("granted");
      onError(""); // Clear any errors
      return true;
    } catch (error: any) {
      console.error("[v0] Microphone access error:", error);

      // Handle specific error types
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setMicPermission("denied");
        onError(
          "🚫 Microphone access denied. Please click 'Allow' when prompted, or enable microphone in your browser settings."
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        onError(
          "❌ No microphone found. Please connect a microphone and try again."
        );
      } else if (error.name === "NotReadableError") {
        onError(
          "⚠️ Microphone is already in use by another application. Please close other apps and try again."
        );
      } else if (error.name === "OverconstrainedError") {
        onError(
          "⚠️ Microphone doesn't meet requirements. Please try a different microphone."
        );
      } else if (error.name === "SecurityError") {
        onError(
          "🔒 Security error: Microphone access requires HTTPS or localhost."
        );
      } else {
        onError(
          `❌ Could not access microphone: ${error.message || error.name || "Unknown error"}`
        );
      }

      return false;
    }
  };

  // ✅ Start recording (triggered by user click/tap - user gesture required)
  const startListening = async () => {
    if (!recognitionRef.current || !isBrowserSupported || !isHttpsSecure) {
      console.log("[v0] Cannot start - missing requirements");
      return;
    }

    console.log("[v0] Start listening called - requesting mic permission...");

    // ⚠️ CRITICAL: This must be called directly from user gesture (button click)
    // Request microphone access with getUserMedia
    const hasPermission = await requestMicrophonePermission();

    if (!hasPermission) {
      console.log("[v0] Permission denied or error occurred");
      return;
    }

    // Permission granted, now start speech recognition
    shouldListenRef.current = true;
    isStoppingRef.current = false;
    retryCountRef.current = 0;
    onError(""); // Clear any previous errors

    try {
      console.log("[v0] Starting speech recognition...");
      recognitionRef.current.start();
    } catch (error: any) {
      console.error("[v0] Failed to start recognition:", error);
      
      if (error.name === "InvalidStateError") {
        // Recognition already started, try stopping and restarting
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (e) {
              onError("Failed to restart recognition. Please refresh the page.");
            }
          }, 100);
      } catch (e) {
          onError("Recognition is already running. Please wait.");
      }
      } else {
        onError(`Failed to start voice recognition: ${error.message || "Please try again"}`);
    }
  }
  };

  // ✅ Stop recording and cleanup
  const stopListening = () => {
    console.log("[v0] 🛑 Stopping listening...");

    // Clear any pending restart timeout
    if (restartTimeoutRef.current) {
      console.log("[v0] Clearing pending restart timeout");
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Set flags to prevent restart
    shouldListenRef.current = false;
    isStoppingRef.current = true;
    setIsRetrying(false); // Clear retrying state

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.log("[v0] Error stopping recognition:", e);
      }
    }

    // Stop and release microphone stream
    if (micStreamRef.current) {
      console.log("[v0] Releasing microphone stream...");
      micStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("[v0] Track stopped:", track.label);
      });
      micStreamRef.current = null;
    }

    onListeningChange(false);
  };

  // Show error if HTTPS is not enabled
  if (!isHttpsSecure) {
    return (
      <div className="bg-red-100 border-2 border-red-400 rounded-2xl p-6 text-center">
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
  if (!isBrowserSupported) {
    return (
      <div className="bg-red-100 border-2 border-red-400 rounded-2xl p-6 text-center">
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
    <div className="flex flex-col items-center gap-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-purple-700 font-bold text-lg mb-2">
              {isRetrying
                ? "🔄 Reconnecting..."
                : isListening
                ? "🎤 Listening..."
                : "🎙️ Voice Input"}
            </p>
            <p className="text-purple-600 text-sm">
              {isRetrying
                ? "Restarting voice recognition, please wait..."
                : isListening
                ? "Keep talking! I'm recording your voice."
                : "Click the microphone to start speaking."}
            </p>
          </div>

          <button
            onClick={isListening ? stopListening : startListening}
            disabled={micPermission === "denied" && !isListening}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center font-bold text-white text-lg transition-all duration-300 ${
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : micPermission === "denied"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:scale-105"
            }`}
          >
            {isListening ? <Square size={40} /> : <Mic size={40} />}
          </button>

            <p className="text-purple-600 text-sm font-medium">
            {isListening ? "Tap to stop recording" : "Tap to start speaking"}
          </p>

          {/* Permission Tips */}
          {!isListening && (
            <>
              {micPermission === "denied" && (
                <div className="w-full bg-red-50 border-2 border-red-300 rounded-xl p-4 text-sm">
                  <p className="font-bold text-red-700 mb-3">
                    🚫 Microphone Access Blocked
                  </p>
                  <div className="text-left space-y-3">
                    <div>
                      <p className="font-semibold text-gray-800 mb-1">📱 On Mobile:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 ml-2">
                        <li>Open your phone <strong>Settings</strong></li>
                        <li>
                          Find <strong>Safari</strong> or <strong>Chrome</strong>
                        </li>
                        <li>
                          Enable <strong>Microphone</strong> permission
                        </li>
                        <li>Return here and <strong>refresh</strong> the page</li>
                      </ol>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 mb-1">💻 On Desktop:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 ml-2">
                        <li>
                          Click the 🔒 icon in your browser's address bar
                        </li>
                        <li>
                          Find <strong>"Microphone"</strong> setting
                        </li>
                        <li>
                          Change to <strong>"Allow"</strong>
                        </li>
                        <li>
                          <strong>Refresh</strong> this page
                        </li>
                      </ol>
          </div>
                  </div>
                </div>
              )}
              {micPermission === "prompt" && (
                <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-xs">
                  <p className="font-semibold text-blue-700 mb-2">
                    💡 First Time Setup:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-2">
                    <li>Click the microphone button above</li>
                    <li>
                      Your browser will ask: <strong>"Allow microphone access?"</strong>
                    </li>
                    <li>
                      Click <strong>"Allow"</strong> or <strong>"Yes"</strong>
                    </li>
                    <li>Start speaking your coloring page idea!</li>
                  </ol>
                  <p className="text-gray-600 mt-2 text-center italic">
                    Permission is saved for next time ✓
                  </p>
                </div>
              )}
              {micPermission === "granted" && (
                <div className="w-full bg-green-50 border-2 border-green-200 rounded-xl p-3 text-xs">
                  <p className="font-semibold text-green-700 mb-1 flex items-center justify-center gap-2">
                    <span>✅</span>
                    <span>Microphone Ready</span>
                  </p>
                  <p className="text-gray-700 text-center">
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
          <div className="w-2 h-8 bg-purple-500 rounded-full animate-bounce" />
          <div
            className="w-2 h-8 bg-pink-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="w-2 h-8 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      )}
    </div>
  );
}
