import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const { audio, mimeType } = await request.json();

    if (!audio) {
      return NextResponse.json(
        { error: 'No audio data provided' },
        { status: 400 }
      );
    }

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    console.log('Processing audio with Gemini AI...');
    console.log('Audio size:', audioBuffer.length, 'bytes');

    // Use Gemini AI to process audio and generate description in one step
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please transcribe this audio recording and then create a detailed, child-friendly description for a coloring page. The description should be suitable for generating a coloring book illustration.

Requirements:
1. First, transcribe what the person said
2. Then, create a detailed description for a coloring page that includes:
   - The main subject/character
   - Simple, clear lines suitable for coloring
   - Child-friendly elements
   - Background details
   - Any specific objects or scenes mentioned

Format your response as:
TRANSCRIPT: [what they said]
DESCRIPTION: [detailed coloring page description]

Make the description vivid and specific enough for AI image generation, but keep it simple and fun for children.`
            },
            {
              type: 'image',
              image: `data:${mimeType || 'audio/webm'};base64,${audio}`
            }
          ]
        }
      ],
    });

    console.log('Gemini AI response:', result.text);

    // Parse the response to extract transcript and description
    const responseText = result.text;
    const transcriptMatch = responseText.match(/TRANSCRIPT:\s*([\s\S]+?)(?=DESCRIPTION:|$)/);
    const descriptionMatch = responseText.match(/DESCRIPTION:\s*([\s\S]+?)$/);

    const transcript = transcriptMatch ? transcriptMatch[1].trim() : '';
    const description = descriptionMatch ? descriptionMatch[1].trim() : responseText;

    console.log('Extracted transcript:', transcript);
    console.log('Extracted description:', description);

    return NextResponse.json({
      transcript,
      description,
      fullResponse: result.text,
      usage: result.usage
    });

  } catch (error: any) {
    console.error('Audio processing error:', error);
    
    // Handle specific Gemini API errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please check your environment variables.' },
        { status: 500 }
      );
    }

    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'Gemini API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('audio')) {
      return NextResponse.json(
        { error: 'Failed to process audio. Please try recording again.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Audio processing failed: ${error.message}` },
      { status: 500 }
    );
  }
}
