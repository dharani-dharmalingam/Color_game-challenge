'use client';

import { useState } from 'react';
import Image from 'next/image';
import VoiceRecorder from './api/generate/VoiceRecorder';
import VoiceRecorderWithGemini from './api/generate/VoiceRecorderWithGemini';


export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [useGeminiVoice, setUseGeminiVoice] = useState(false);


  const handleTranscript = (text: string) => {
  setPrompt(text); // Update the textarea as user speaks
};

  const handleError = (error: string) => {
    setError(error); // Show any recognition errors
  };

  const handleListeningChange = (listening: boolean) => {
    setIsListening(listening); // Update UI for recording state
  };


  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please describe what you want to color!');
      return;
    }

    setLoading(true);
    setError('');
    setImageUrl(null);
    setVideoUrl(null);
    setGenerationStatus('Creating your coloring page...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          setGenerationStatus(data.videoUrl ? '✨ Image and animated story ready!' : '✨ Coloring page ready!');
        }
        if (data.videoUrl) {
          setVideoUrl(data.videoUrl);
        }
        
        if (!data.imageUrl) {
          setError(data.message || 'Failed to generate content. Please try again!');
        }
      } else {
        setError(data.message || 'Failed to generate image. Please try again!');
      }
    } catch (err) {
      setError('Oops! Something went wrong. Please try again!');
    } finally {
      setLoading(false);
      setTimeout(() => setGenerationStatus(''), 3000);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#6b46c1'}}>
      {/* Animated painting background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating paint drops */}
        <div className="absolute top-10 left-10 w-16 h-20 bg-white rounded-full opacity-20 animate-bounce" style={{borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'}}></div>
        <div className="absolute top-32 right-20 w-12 h-16 bg-white rounded-full opacity-15 animate-bounce" style={{animationDelay: '0.8s', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'}}></div>
        <div className="absolute bottom-20 left-1/4 w-10 h-14 bg-white rounded-full opacity-25 animate-bounce" style={{animationDelay: '1.2s', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'}}></div>
        <div className="absolute bottom-40 right-1/3 w-14 h-18 bg-white rounded-full opacity-20 animate-bounce" style={{animationDelay: '1.6s', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'}}></div>
        
        {/* Paint brush strokes */}
        <div className="absolute top-1/4 left-1/3 w-32 h-4 bg-white opacity-10 rounded-full transform rotate-12 animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-3 bg-white opacity-15 rounded-full transform -rotate-12 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/3 left-1/5 w-28 h-3 bg-white opacity-12 rounded-full transform rotate-45 animate-pulse" style={{animationDelay: '2s'}}></div>
        
        {/* Paint splatters */}
        <div className="absolute top-20 right-1/2 w-6 h-6 bg-white opacity-20 rounded-full animate-ping"></div>
        <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-white opacity-25 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-1/2 left-1/6 w-5 h-5 bg-white opacity-18 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
      </div>
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-3">
              <span className="text-purple-600">🎨</span>{' '}
              <span className="text-purple-600">COLOR</span>{' '}
              <span className="text-purple-600">WORLD</span>{' '}
              <span className="text-purple-600">🎬</span>
            </h1>
            <p className="text-lg md:text-xl text-purple-500 font-semibold mb-2">
              Create amazing coloring pages with AI!
            </p>
            <p className="text-sm md:text-base text-purple-400">
              Get both a coloring page AND an animated story video! 🎉
            </p>
            <p className="text-xs md:text-sm text-purple-300 mt-2">
              ✨ NEW: Use AI Voice to record and process your ideas! 🤖
            </p>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Input Section */}
            <div className="bg-white rounded-3xl shadow-2xl p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-purple-600 mb-2">
                  What do you want to color? ✏️
                </h2>
                <div className="flex justify-center gap-2 mb-4">
                  <span className="text-2xl animate-bounce">🎨</span>
                  <span className="text-2xl animate-bounce" style={{animationDelay: '0.2s'}}>🖍️</span>
                  <span className="text-2xl animate-bounce" style={{animationDelay: '0.4s'}}>✨</span>
                </div>
              </div>

              {/* Voice Recording Options 
              <div className="mb-6">
                
                <div className="flex justify-center mb-4">
                  <div className="bg-white rounded-full p-1 shadow-lg">
                    <button
                      onClick={() => setUseGeminiVoice(false)}
                      className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                        !useGeminiVoice 
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                          : 'text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      🎤 Live Speech
                    </button>
                    <button
                      onClick={() => setUseGeminiVoice(true)}
                      className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                        useGeminiVoice 
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                          : 'text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      🤖 AI Voice
                    </button>
                  </div>
                </div>

                {useGeminiVoice ? (
                  <VoiceRecorderWithGemini
                    onTranscript={handleTranscript}
                    onError={handleError}
                    onLoading={setLoading}
                  />
                ) : (
                  <VoiceRecorder
                    onTranscript={handleTranscript}
                    onError={handleError}
                    onListeningChange={handleListeningChange}
                    isListening={isListening}
                  />
                )}
              </div> */}
          
              
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type your idea here! Like: a happy dinosaur, a princess castle, a rocket ship..."
                  className="w-full h-40 p-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-400 resize-none text-gray-800 font-semibold placeholder:text-gray-400 placeholder:font-normal shadow-inner"
                />
                <div className="absolute top-2 right-2 text-2xl">💭</div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl text-red-700 font-bold">
                  {error.includes('Network Error') || error.includes('internet') ? (
                    <div className="text-left space-y-2">
                      <p className="text-center font-bold">{error.split('\n')[0]}</p>
                      {error.includes('•') && (
                        <ul className="list-none space-y-1 text-sm mt-2 bg-white/50 rounded-lg p-3">
                          {error.split('\n').slice(1).map((line, idx) => (
                            line.trim() && <li key={idx} className="text-gray-700">{line}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="text-center">{error}</p>
                  )}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 active:scale-95 disabled:bg-gray-300 text-white font-black text-xl md:text-2xl py-4 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="animate-spin text-2xl">🎨</span> 
                    <span>Creating Magic...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🎨</span>
                    <span>Create Page & Video!</span>
                    <span>🎬</span>
                  </span>
                )}
              </button>

              {/* Fun tips */}
              
            </div>

            {/* Output Section */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 min-h-[500px] flex flex-col">
              <div className="text-center mb-4">
                <h2 className="text-2xl md:text-3xl font-black text-purple-600 mb-2">
                  Your Coloring Page! 🖍️
                </h2>
                <div className="flex justify-center gap-2">
                  <span className="text-xl animate-bounce">🎨</span>
                  <span className="text-xl animate-bounce" style={{animationDelay: '0.3s'}}>🖍️</span>
                  <span className="text-xl animate-bounce" style={{animationDelay: '0.6s'}}>✨</span>
                </div>
              </div>
              
              {generationStatus && (
                <div className="mb-4 p-3 bg-green-50 rounded-xl text-green-700 text-center font-bold animate-pulse">
                  {generationStatus}
                </div>
              )}
              
              <div className="flex-1 flex flex-col items-center justify-center">
                {loading ? (
                  <div className="text-center">
                    {/* Custom Loading Animation */}
                    <div className="relative w-32 h-32 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                      <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-pink-500 border-r-purple-500 border-b-cyan-500 border-l-orange-500 animate-spin"></div>
                      <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-yellow-400 border-r-green-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                      <div className="absolute inset-8 rounded-full border-2 border-transparent border-t-red-400 border-r-blue-400 animate-spin" style={{animationDuration: '2s'}}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl animate-bounce">🎨</span>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-purple-600 mb-2">
                      Creating your coloring page...
                    </p>
                    <p className="text-lg text-gray-600 mb-1">
                      This might take 2-3 minutes!
                    </p>
                    <p className="text-sm text-gray-500">
                      We're generating both an image and animated video ✨
                    </p>
                    <div className="flex justify-center gap-1 mt-4">
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : imageUrl ? (
                  <div className="w-full space-y-4">
                    {/* Image Section */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h3 className="text-lg font-black text-purple-600 mb-3 text-center">
                        🎨 Your Coloring Page
                      </h3>
                      <div className="relative w-full aspect-square bg-white rounded-xl overflow-hidden shadow-lg">
                        <Image
                          src={imageUrl}
                          alt="Generated coloring page"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                    
                    {/* Video Section - Show if available */}
                    {videoUrl && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <h3 className="text-lg font-black text-purple-600 mb-3 text-center">
                          🎬 Animated Story
                        </h3>
                        <div className="relative w-full aspect-video bg-white rounded-xl overflow-hidden shadow-lg">
                          <video
                            src={videoUrl}
                            controls
                            autoPlay
                            loop
                            muted
                            className="w-full h-full object-contain"
                            playsInline
                          >
                            Your browser doesn't support video playback.
                          </video>
                        </div>
                      </div>
                    )}
                    
                    {/* Download Buttons */}
                    <div className="flex gap-3">
                      <a
                        href={imageUrl}
                        download="coloring-page.png"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 active:scale-95 text-white font-black text-lg py-3 px-4 rounded-full shadow-lg transition-all duration-200 text-center transform hover:scale-105"
                      >
                        📥 Download Image
                      </a>
                      {videoUrl && (
                        <a
                          href={videoUrl}
                          download="coloring-video.mp4"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 active:scale-95 text-white font-black text-lg py-3 px-4 rounded-full shadow-lg transition-all duration-200 text-center transform hover:scale-105"
                        >
                          🎥 Download Video
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-300 to-purple-400 rounded-full animate-pulse"></div>
                      <div className="absolute inset-2 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                      <div className="absolute inset-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl">🎨</span>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-purple-600 mb-2">
                      Your coloring page will appear here!
                    </p>
                    <p className="text-lg text-gray-600 mb-2">
                      Type your idea and click create!
                    </p>
                    <p className="text-sm text-purple-500 font-semibold">
                      ✨ You'll get both a coloring page and an animated video!
                    </p>
                    <div className="flex justify-center gap-2 mt-4">
                      <span className="text-2xl animate-bounce">🖍️</span>
                      <span className="text-2xl animate-bounce" style={{animationDelay: '0.2s'}}>🎬</span>
                      <span className="text-2xl animate-bounce" style={{animationDelay: '0.4s'}}>✨</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
