import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120; // Increased for MagicHour API polling

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // MagicHour API configuration
    const token = process.env.MAGICHOUR_API_KEY || "mhk_live_VWEEC58w2ZrcOAQeieHWKW4NQana1GghX8J9cvJuKgleCXYOaG9PNbOEPeiruFOdPhlagKH6cQ4HiBm8";

    // Enhanced prompt for high-quality coloring page
    const enhancedPrompt = `Create a children's coloring book page featuring ${prompt}.
    
    CRITICAL REQUIREMENTS:
    - Pure white background (no grey, no texture, no patterns)
    - Thick, bold black outlines only (2-3px thick)
    - No shading, gradients, or fill colors
    - No pixelated or jagged edges
    - Clean, smooth line art style
    - Simple shapes suitable for ages 3-8
    - Large, distinct areas to color
    - No fine details or complex textures
    - Cartoon/anime style, not realistic
    - High contrast black lines on white background
    - Professional coloring book quality
    
    Style: Simple line art, cartoon illustration, children's coloring book page, clean vector-style drawing.`;

    console.log("🎨 Creating MagicHour image generation job...");

    try {
      // Step 1: Create an image generation job
      const createResponse = await fetch("https://api.magichour.ai/v1/ai-image-generator", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "authorization": `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: `Coloring Page: ${prompt}`,
          image_count: 1,
          orientation: "square",
          style: {
            prompt: enhancedPrompt,
            tool: "ai-anime-generator"
          }
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("❌ MagicHour job creation failed:", errorText);
        return NextResponse.json({
          success: true,
          prompt,
          imageUrl: null,
          useFallback: true,
          message: "Image generation failed, using fallback",
        });
      }

      const createData = await createResponse.json();
      console.log("✅ Job created:", createData);

      if (!createData.id) {
        console.error("❌ No job ID returned:", createData);
        return NextResponse.json({
          success: true,
          prompt,
          imageUrl: null,
          useFallback: true,
          message: "Job creation failed, using fallback",
        });
      }

      const projectId = createData.id;

      // Step 2: Poll for generation completion
      console.log("⏳ Waiting for image generation...");
      
      let project;
      let attempts = 0;
      const maxAttempts = 30; // ~90 seconds total if 3s interval

      do {
        const statusResponse = await fetch(`https://api.magichour.ai/v1/image-projects/${projectId}`, {
          headers: {
            "accept": "application/json",
            "authorization": `Bearer ${token}`
          }
        });

        if (!statusResponse.ok) {
          console.error("❌ Status check failed");
          break;
        }

        project = await statusResponse.json();
        console.log(`📊 Status: ${project.status || "fetching..."} (attempt ${attempts + 1})`);

        if (project.status === "completed" || project.status === "complete") {
          break;
        }

        await new Promise(r => setTimeout(r, 3000)); // wait 3 seconds
        attempts++;

        if (attempts > maxAttempts) {
          console.error("❌ Timed out waiting for image generation");
          return NextResponse.json({
            success: true,
            prompt,
            imageUrl: null,
            useFallback: true,
            message: "Image generation timed out, using fallback",
          });
        }
      } while (true);

      console.log("✅ Generation completed!");

      // Step 3: Extract image URL
      const images = [
        ...(project.outputs || []),
        ...(project.frames || []),
        ...(project.downloads || [])
      ];

      if (images.length > 0) {
        const imageUrl = images[0].url || images[0].output_url;
        
        if (imageUrl) {
          console.log("🖼️ Image generated successfully:", imageUrl);
          
          return NextResponse.json({
            success: true,
            prompt,
            imageUrl: imageUrl,
            useFallback: false,
            message: "Image generated successfully",
          });
        }
      }

      console.error("⚠️ No image URLs found in response");
      return NextResponse.json({
        success: true,
        prompt,
        imageUrl: null,
        useFallback: true,
        message: "No image generated, using fallback",
      });

    } catch (apiError: any) {
      console.error("❌ MagicHour API error:", apiError.message || apiError);
      
      return NextResponse.json({
        success: true,
        prompt,
        imageUrl: null,
        useFallback: true,
        message: "API error, using fallback",
      });
    }
  } catch (error: any) {
    console.error("💥 Error in generate route:", error);
    return NextResponse.json(
      {
        success: true,
        prompt: "",
        imageUrl: null,
        useFallback: true,
        message: "Error occurred, using fallback",
      },
      { status: 200 }
    );
  }
}
