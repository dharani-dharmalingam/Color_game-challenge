import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const maxDuration = 30; // limit for generation

export async function POST(req: Request) {
  // 🧩 Parse body safely
  const body = await req.json().catch(() => ({}));
  const { messages } = body || {};

  // ✅ Extract the user's prompt from messages
  let userPrompt = "A cute kitten painting a rainbow"; // default fallback
  
  if (Array.isArray(messages) && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.content) {
      userPrompt = lastMessage.content;
    }
  }

  try {

    // 🔑 Initialize Gemini AI with your key
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });

    const modelName = "gemini-2.5-flash"; // use stable model

    // 🧠 Stream short story generation
    const result = streamText({
      model: google(modelName),
      messages: [
        {
          role: "system",
          content: `You are a magical storyteller for children aged 3–12.
          Write a captivating, longer story (150-250 words) based on the user's idea.
          The story should:
          - Be engaging and imaginative with vivid descriptions
          - Include dialogue and character interactions
          - Have multiple scenes or adventures
          - Contain friendly characters (animals, magical creatures, heroes)
          - Build excitement with a clear beginning, middle, and satisfying ending
          - Use descriptive language that sparks imagination
          - Include emotions and lessons about friendship, kindness, or courage
          - Be perfect for inspiring detailed coloring pages
          
          Make it a complete adventure that children will love to read and imagine!`,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.8,
    });

    console.log("✅ Story generation started for:", userPrompt);
    return result.toTextStreamResponse();
    
  } catch (error) {
    console.error("❌ Story generation error:", error);
    
    // Return a longer fallback story instead of error
    const fallbackStory = `Once upon a time, in a land filled with wonder and magic, there lived a special ${userPrompt}. This wasn't just any ordinary creature - it had a heart full of dreams and eyes that sparkled with curiosity.

Every morning, the ${userPrompt} would wake up and look out at the beautiful world around it. "What adventure will today bring?" it would wonder, stretching and getting ready for whatever magical moments awaited.

One day, while exploring a meadow filled with colorful flowers, the ${userPrompt} discovered something amazing. Hidden beneath a rainbow was a group of friendly animals who had been waiting for a new friend just like it!

"Welcome!" they called out cheerfully. "We've been hoping someone kind and brave would come along!"

Together, they spent the day playing games, sharing stories, and helping each other. The ${userPrompt} learned that the best adventures happen when you're kind to others and open to making new friends.

As the golden sun began to set, painting the sky in beautiful shades of pink and orange, the ${userPrompt} smiled. It had found not just an adventure, but a whole family of friends who would always be there.

And from that day forward, they all lived happily ever after, creating magical memories and wonderful adventures together! ✨🌟`;
    
    return new Response(fallbackStory, {
      status: 200,
      headers: { 
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      },
    });
  }
}
