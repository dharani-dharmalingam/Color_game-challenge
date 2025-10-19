"use client";

import React, { useState, useRef, useEffect } from "react";

interface VoiceRecorderWithGeminiProps {
  onTranscript: (transcript: string) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

export default function VoiceRecorderWithGemini({
  onTranscript,
  onError,
  onLoading,
}: VoiceRecorderWithGeminiProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<PermissionState | null>(null);
  const [isHttpsSecure, setIsHttpsSecure] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check HTTPS and microphone permission
  useEffect(() => {
    // Check if served over HTTPS (or localhost)
    const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost";
    setIsHttpsSecure(isSecure);

    // Check microphone permission
    const checkPermission = async () => {
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: "microphone" as PermissionName });
          setMicPermission(permission.state);
          
          permission.onchange = () => {
            setMicPermission(permission.state);
          };
        }
      } catch (error) {
        console.log("Permission API not available:", error);
      }
    };

    checkPermission();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Request microphone permission explicitly
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop immediately, we just needed permission
      setMicPermission("granted");
      return true;
    } catch (error: any) {
      console.error("Microphone permission error:", error);
      let errorMsg = "Microphone access denied. ";
      
      if (error.name === "NotAllowedError") {
        errorMsg += "Please allow microphone access in your browser settings and try again.";
      } else if (error.name === "NotFoundError") {
        errorMsg += "No microphone found. Please connect a microphone and try again.";
      } else if (error.name === "NotReadableError") {
        errorMsg += "Microphone is being used by another application. Please close other apps and try again.";
      } else if (error.name === "SecurityError") {
        errorMsg += "Microphone access blocked due to security restrictions.";
      } else {
        errorMsg += "Please check your microphone settings and try again.";
      }
      
      onError(errorMsg);
      setMicPermission("denied");
      return false;
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!isHttpsSecure) {
      onError("❌ Voice recording requires HTTPS. Please use a secure connection.");
      return;
    }

    if (micPermission === "denied") {
      onError("❌ Microphone access denied. Please allow microphone access in your browser settings.");
      return;
    }

    try {
      // Request microphone permission
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) return;

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Create audio URL for playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (error: any) {
      console.error("Recording error:", error);
      onError(`Recording failed: ${error.message}`);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Process audio with Gemini AI
  const processAudioWithGemini = async () => {
    if (!audioBlob) {
      onError("No audio recorded. Please record something first.");
      return;
    }

    setIsProcessing(true);
    onLoading(true);

    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send to our API route for Gemini processing
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: 'audio/webm'
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Send the processed description to parent component (use description for better image generation)
      onTranscript(result.description || result.transcript);
      
    } catch (error: any) {
      console.error("Audio processing error:", error);
      onError(`Failed to process audio: ${error.message}`);
    } finally {
      setIsProcessing(false);
      onLoading(false);
    }
  };

  // Clear recording
  const clearRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-purple-600 mb-2">🎤 Voice to AI</h3>
        <p className="text-gray-600">Record your voice and let AI create your coloring page!</p>
      </div>

      {/* Security Check */}
      {!isHttpsSecure && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 font-medium">⚠️ HTTPS Required</p>
          <p className="text-red-500 text-sm">Voice recording requires a secure connection (HTTPS).</p>
        </div>
      )}

      {/* Permission Status */}
      {micPermission === "denied" && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 font-medium">🎤 Microphone Access Denied</p>
          <p className="text-red-500 text-sm">Please allow microphone access in your browser settings.</p>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-4">
        {/* Record Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isHttpsSecure || micPermission === "denied" || isProcessing}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold
            transition-all duration-300 transform hover:scale-105
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
            }
            ${(!isHttpsSecure || micPermission === "denied" || isProcessing) 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer'
            }
          `}
        >
          {isRecording ? '⏹️' : '🎤'}
        </button>

        {/* Recording Status */}
        {isRecording && (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-red-500">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Recording... {formatTime(recordingTime)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Click the button again to stop</p>
          </div>
        )}

        {/* Audio Playback */}
        {audioUrl && !isRecording && (
          <div className="w-full max-w-md">
            <p className="text-sm text-gray-600 mb-2 text-center">Your recording ({formatTime(recordingTime)}):</p>
            <audio 
              controls 
              src={audioUrl} 
              className="w-full"
              style={{ borderRadius: '8px' }}
            />
          </div>
        )}

        {/* Process Button */}
        {audioBlob && !isRecording && (
          <div className="flex space-x-3">
            <button
              onClick={processAudioWithGemini}
              disabled={isProcessing}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all duration-300
                ${isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                }
              `}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing with AI...</span>
                </div>
              ) : (
                '🤖 Process with AI'
              )}
            </button>

            <button
              onClick={clearRecording}
              disabled={isProcessing}
              className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors duration-200"
            >
              🗑️ Clear
            </button>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">AI is processing your voice...</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg">
        <h4 className="font-medium text-purple-700 mb-2">📝 How to use:</h4>
        <ol className="text-sm text-purple-600 space-y-1">
          <li>1. Click the microphone to start recording</li>
          <li>2. Speak clearly about what you want to draw</li>
          <li>3. Click stop when you're done</li>
          <li>4. Click "Process with AI" to convert to text</li>
          <li>5. Generate your coloring page!</li>
        </ol>
      </div>
    </div>
  );
}
