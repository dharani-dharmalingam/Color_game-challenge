'use client';

import { useState, useEffect } from 'react';
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
  const [imageLoading, setImageLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [story, setStory] = useState('');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);


  const handleTranscript = (text: string) => {
  setPrompt(text); // Update the textarea as user speaks
};

  const handleError = (error: string) => {
    setError(error); // Show any recognition errors
  };

  const handleListeningChange = (listening: boolean) => {
    setIsListening(listening); // Update UI for recording state
  };

  // Generate story based on prompt
  const generateStory = async (userPrompt: string) => {
    if (!userPrompt.trim() || isGeneratingStory) return;
    
    setIsGeneratingStory(true);
    setStory('');

    try {
      console.log('🎭 Generating story for:', userPrompt);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is streaming or plain text
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/plain')) {
        // Handle fallback response
        const fallbackStory = await response.text();
        setStory(fallbackStory);
      } else {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let accumulatedStory = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              accumulatedStory += chunk;
              setStory(accumulatedStory);
              
              // Add small delay for better visual effect (slower for longer stories)
              await new Promise(resolve => setTimeout(resolve, 30));
            }
          } catch (streamError) {
            console.error('Streaming error:', streamError);
            // If streaming fails, use what we have
            if (accumulatedStory) {
              setStory(accumulatedStory);
            }
          }
        }
      }
      
      console.log('✅ Story generation completed');
      
    } catch (error) {
      console.error('❌ Story generation error:', error);
      
      // Provide a longer fallback story
      const fallbackStory = `Once upon a time, in a magical land far away, there lived a wonderful ${userPrompt}. Every morning, it would wake up with excitement, ready for new adventures.

One sunny day, it discovered a hidden path through the enchanted forest. Along the way, it met friendly creatures who became its best friends. Together, they explored mysterious caves, crossed sparkling rivers, and climbed tall mountains.

The ${userPrompt} learned about courage, kindness, and the power of friendship. When challenges appeared, they worked together to solve them with creativity and love.

As the sun set, painting the sky in beautiful colors, the ${userPrompt} realized that the greatest treasure wasn't gold or jewels, but the wonderful friends it had made and the memories they shared.

And so, they all lived happily ever after, always ready for their next magical adventure! 🌟✨`;
      setStory(fallbackStory);
      
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // Clear story when prompt is empty
  useEffect(() => {
    if (!prompt.trim()) {
      setStory('');
    }
  }, [prompt]);

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

    // First generate the story
    if (prompt.trim() && prompt.length > 3) {
      await generateStory(prompt);
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      console.log('API Response:', data);

       if (data.success) {
         // Display image immediately if available
         if (data.imageUrl) {
           setImageLoading(true);
        setImageUrl(data.imageUrl);
           setGenerationStatus('✨ Coloring page ready!');
           
           // If video is also available, update status
           if (data.videoUrl) {
             setVideoUrl(data.videoUrl);
             setGenerationStatus('✨ Image and animated story ready!');
           }
         } else {
           // No image generated
           setError(data.message || 'Failed to generate image. Please try again!');
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
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 relative overflow-hidden">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating bubbles */}
        <div className="absolute top-20 left-10 w-8 h-8 bg-white/10 rounded-full animate-float" style={{animationDelay: '0s', animationDuration: '6s'}}></div>
        <div className="absolute top-40 right-20 w-6 h-6 bg-white/8 rounded-full animate-float" style={{animationDelay: '2s', animationDuration: '8s'}}></div>
        <div className="absolute bottom-32 left-1/4 w-4 h-4 bg-white/12 rounded-full animate-float" style={{animationDelay: '4s', animationDuration: '7s'}}></div>
        <div className="absolute bottom-20 right-1/3 w-5 h-5 bg-white/6 rounded-full animate-float" style={{animationDelay: '1s', animationDuration: '9s'}}></div>
        
        {/* Gentle sparkles */}
        <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-white/20 rounded-full animate-twinkle" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-white/25 rounded-full animate-twinkle" style={{animationDelay: '3s'}}></div>
        <div className="absolute bottom-1/2 left-1/5 w-1.5 h-1.5 bg-white/15 rounded-full animate-twinkle" style={{animationDelay: '6s'}}></div>
      </div>
      
      {/* Add custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
      
      <div className="container mx-auto px-3 py-4 relative z-10">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-4 border border-white/20">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-purple-700">
              <span className="text-2xl">🎨</span>DoodleDreams <span className="text-2xl">✨</span>
          </h1>
            <p className="text-sm md:text-base text-purple-600 font-medium">
              Create beautiful coloring pages & animated stories!
          </p>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Input Section */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-5 border border-white/20">
              <div className="text-center mb-4">
                <h2 className="text-lg md:text-xl font-bold text-purple-700 mb-2">
                  What would you like to color? <span className="text-lg">🎨</span>
              </h2>
                <div className="flex justify-center gap-1">
                  <span className="text-sm animate-pulse">✨</span>
                  <span className="text-xs text-purple-500 font-medium">Describe your idea below</span>
                  <span className="text-sm animate-pulse">✨</span>
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
          
              
              <div className="relative mb-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A cute cat, magical castle, flying dragon, rainbow unicorn..."
                  className="w-full h-24 p-3 text-sm border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 resize-none text-gray-700 placeholder:text-gray-400 transition-all duration-200 bg-white/80"
                />
                <div className="absolute top-2 right-2 text-lg opacity-50">💭</div>
              </div>

              {/* Enhanced Story Display */}
              {(story || isGeneratingStory) && (
                <div className="mb-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-purple-200 shadow-lg overflow-hidden">
                  {/* Story Header */}
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-lg">📚</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-base">Your Magical Story</h3>
                        <p className="text-purple-100 text-xs">Generated by AI storyteller</p>
                      </div>
                      {isGeneratingStory && (
                        <div className="flex items-center gap-2 text-white/80">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span className="text-xs">Writing...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Story Content */}
                  <div className="p-4">
                    {story ? (
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap animate-fade-in">
                            {story}
                          </p>
                        </div>
                        
                        {/* Story Stats */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                             
                            </span>
                            <span className="flex items-center gap-1">
                              <span>⏱️</span>
                              ~{Math.ceil(story.split(' ').length / 100)} min read
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-green-600 font-medium">✨ Story Complete</span>
                          </div>
                        </div>
                      </div>
                    ) : isGeneratingStory ? (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 border-4 border-purple-200 rounded-full"></div>
                            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg">✍️</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-purple-700 font-medium">Creating your magical story...</p>
                            <p className="text-purple-500 text-xs mt-1">This may take a moment for longer stories</p>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-3 p-3 bg-red-50/80 backdrop-blur-sm rounded-lg text-red-600 text-sm border border-red-200">
                  {error.includes('Network Error') || error.includes('internet') ? (
                    <div className="space-y-1">
                      <p className="font-medium text-center">{error.split('\n')[0]}</p>
                      {error.includes('•') && (
                        <ul className="list-none space-y-1 text-xs mt-2 bg-white/50 rounded-md p-2">
                          {error.split('\n').slice(1).map((line, idx) => (
                            line.trim() && <li key={idx} className="text-gray-600">{line}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="text-center font-medium">{error}</p>
                  )}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-base py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Magic...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🎨</span>
                    <span>Create Coloring Page</span>
                    <span>✨</span>
                  </span>
                )}
              </button>

              {/* Fun tips */}
              
            </div>

            {/* Output Section */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-5 min-h-[400px] flex flex-col border border-white/20">
              <div className="text-center mb-3">
                <h2 className="text-lg md:text-xl font-bold text-purple-700 mb-1">
                  Your Creation! <span className="text-lg">🎨</span>
              </h2>
                <div className="flex justify-center gap-1">
                  <span className="text-sm animate-pulse">✨</span>
                  <span className="text-xs text-purple-500">Magic happens here</span>
                  <span className="text-sm animate-pulse">✨</span>
                </div>
              </div>
              
              {generationStatus && (
                <div className="mb-3 p-2 bg-green-50/80 backdrop-blur-sm rounded-lg text-green-700 text-center font-medium text-sm border border-green-200">
                  {generationStatus}
                </div>
              )}
              
              <div className="flex-1 flex flex-col items-center justify-center">
                {loading ? (
                  <div className="text-center py-8">
                    {/* Gentle Loading Animation */}
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl animate-pulse">🎨</span>
                      </div>
                    </div>
                    <p className="text-base font-semibold text-purple-700 mb-2">
                      Creating your masterpiece...
                    </p>
                    <p className="text-sm text-purple-600 mb-1">
                      This may take 1-2 minutes
                    </p>
                    <p className="text-xs text-gray-500">
                      Generating image & video ✨
                    </p>
                    <div className="flex justify-center gap-1 mt-3">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : imageUrl ? (
                   <div className="w-full space-y-3">
                     {/* Image Section */}
                     <div className="bg-purple-50/50 rounded-xl p-3 border border-purple-100">
                       <h3 className="text-sm font-bold text-purple-700 mb-2 text-center">
                         🎨 Your Coloring Page
                       </h3>
                       <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                         {imageLoading && (
                           <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                             <div className="text-center">
                               <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-1"></div>
                               <p className="text-xs text-purple-600">Loading...</p>
                             </div>
                           </div>
                         )}
                         <img
                        src={imageUrl}
                        alt="Generated coloring page"
                           className="w-full h-full object-contain"
                           onLoad={() => {
                             console.log('Image loaded successfully');
                             setImageLoading(false);
                           }}
                           onError={(e) => {
                             console.error('Image failed to load:', e);
                             setImageLoading(false);
                             setError('Failed to load image. Please try again.');
                           }}
                      />
                    </div>
                     </div>
                    
                    {/* Video Section - Show if available or loading */}
                    {(videoUrl || videoLoading) && (
                      <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                        <h3 className="text-sm font-bold text-blue-700 mb-2 text-center">
                          🎬 Animated Story
                        </h3>
                        <div className="relative w-full aspect-video bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                          {videoLoading && !videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                              <div className="text-center">
                                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-1"></div>
                                <p className="text-xs text-blue-600">Creating video...</p>
                              </div>
                            </div>
                          )}
                          {videoUrl && (
                            <video
                              src={videoUrl}
                              controls
                              autoPlay
                              loop
                              muted
                              className="w-full h-full object-contain"
                              playsInline
                              onLoadStart={() => setVideoLoading(false)}
                            >
                              Your browser doesn't support video playback.
                            </video>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Download Buttons */}
                    <div className="flex gap-2">
                    <a
                      href={imageUrl}
                      download="coloring-page.png"
                      target="_blank"
                      rel="noopener noreferrer"
                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium text-sm py-2 px-3 rounded-lg shadow-sm transition-all duration-200 text-center transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        📥 Download Image
                      </a>
                      {videoUrl && (
                        <a
                          href={videoUrl}
                          download="coloring-video.mp4"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-sm py-2 px-3 rounded-lg shadow-sm transition-all duration-200 text-center transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          🎥 Download Video
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full animate-pulse"></div>
                      <div className="absolute inset-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl">🎨</span>
                      </div>
                    </div>
                    <p className="text-base font-semibold text-purple-700 mb-2">
                      Your creation will appear here!
                    </p>
                    <p className="text-sm text-purple-600 mb-2">
                      Describe what you'd like to color
                    </p>
                    <p className="text-xs text-gray-500">
                      ✨ Get both a coloring page & animated video
                    </p>
                    <div className="flex justify-center gap-2 mt-3">
                      <span className="text-lg animate-bounce">🖍️</span>
                      <span className="text-lg animate-bounce" style={{animationDelay: '0.2s'}}>🎬</span>
                      <span className="text-lg animate-bounce" style={{animationDelay: '0.4s'}}>✨</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="text-center mt-8 pb-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/20 max-w-md mx-auto">
            <p className="text-xs text-purple-600 font-medium">
              ✨ Made with love for creative kids ✨
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
