'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please describe what you want to color!');
      return;
    }

    setLoading(true);
    setError('');
    setImageUrl(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        setError(data.message || 'Failed to generate image. Please try again!');
      }
    } catch (err) {
      setError('Oops! Something went wrong. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative clouds at bottom */}
      <div className="clouds-bottom"></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 drop-shadow-lg">
            <span className="text-yellow-300">Free</span>{' '}
            <span className="text-pink-300">Coloring</span>{' '}
            <span className="text-cyan-300">Pages</span>
          </h1>
          <p className="text-white text-xl md:text-2xl font-bold drop-shadow-md">
            Create Your Own Coloring Pages! 🎨
          </p>
        </header>

        {/* Main Content Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Input Section */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-purple-300">
              <h2 className="text-3xl font-black text-purple-700 mb-4 text-center">
                What do you want to color? ✏️
              </h2>
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type your idea here! Like: a happy dinosaur, a princess castle, a rocket ship..."
                className="w-full h-48 p-6 text-xl border-4 border-purple-200 rounded-2xl focus:outline-none focus:border-cyan-400 resize-none text-gray-800 font-semibold placeholder:text-gray-400 placeholder:font-normal"
              />

              {error && (
                <div className="mt-4 p-4 bg-pink-100 border-3 border-pink-400 rounded-xl text-pink-700 text-center font-bold">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full mt-6 bg-cyan-400 hover:bg-cyan-500 active:scale-95 disabled:bg-gray-300 text-white font-black text-2xl py-5 px-8 rounded-full shadow-lg transition-all duration-200 border-4 border-white disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="animate-spin">⏳</span> Creating Magic...
                  </span>
                ) : (
                  <span>🎨 Create Coloring Page!</span>
                )}
              </button>

              {/* Fun tips */}
              <div className="mt-6 bg-yellow-50 border-3 border-yellow-300 rounded-2xl p-4">
                <p className="text-purple-700 font-bold text-center text-lg">
                  💡 Try: Animals, Vehicles, Fantasy Characters, Space, Ocean Life!
                </p>
              </div>
            </div>

            {/* Output Section */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-purple-300 min-h-[500px] flex flex-col">
              <h2 className="text-3xl font-black text-purple-700 mb-4 text-center">
                Your Coloring Page! 🖍️
              </h2>
              
              <div className="flex-1 flex items-center justify-center">
                {loading ? (
                  <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">🎨</div>
                    <p className="text-2xl font-bold text-purple-600">
                      Creating your coloring page...
                    </p>
                    <p className="text-lg text-gray-600 mt-2">
                      This might take a minute!
                    </p>
                  </div>
                ) : imageUrl ? (
                  <div className="w-full">
                    <div className="relative w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden border-4 border-purple-200 mb-4">
                      <Image
                        src={imageUrl}
                        alt="Generated coloring page"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <a
                      href={imageUrl}
                      download="coloring-page.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-pink-400 hover:bg-pink-500 active:scale-95 text-white font-black text-xl py-4 px-6 rounded-full shadow-lg transition-all duration-200 text-center border-4 border-white"
                    >
                      📥 Download & Print!
                    </a>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-6xl mb-4">🎨</div>
                    <p className="text-xl font-bold">
                      Your coloring page will appear here!
                    </p>
                    <p className="text-lg mt-2">
                      Type your idea and click create!
                    </p>
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
