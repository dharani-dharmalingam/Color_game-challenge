import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // Increased for image + video generation (5 minutes)

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

     // MagicHour API configuration
     const token = process.env.MAGICHOUR_API_KEY || "mhk_live_HiNL0tRhpZb3LBi6AVxhJhfnV48ONqxITjQHEmEpb24vRhlFGcwzTwzCUefcwgWgzPGEav0ZdfB4yizf";
     
     console.log("🔑 Using API key:", token ? `${token.substring(0, 10)}...` : "NOT FOUND");

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
          
           // Step 4: Generate video from the image
           console.log("🎬 Starting video generation...");
           console.log("📸 Using image URL:", imageUrl);
           let videoUrl = null;
          
          try {
            const videoPrompt = `Animated coloring book story: ${prompt}. Bring this coloring page to life with gentle add color to the page, child-friendly animation. Add slight movement and magical sparkles.`;
            
            const videoRequestBody = {
              name: `Animated Story: ${prompt}`,
              end_seconds:10, // 15 second video as requested
              resolution: "720p",
              style: {
                prompt: videoPrompt
              },
              assets: {
                image_file_path: imageUrl // Use the generated image URL
              }
            };
            
            console.log("🎬 Video request body:", JSON.stringify(videoRequestBody, null, 2));
            
            const videoCreateResponse = await fetch("https://api.magichour.ai/v1/image-to-video", {
              method: "POST",
              headers: {
                "accept": "application/json",
                "authorization": `Bearer ${token}`,
                "content-type": "application/json"
              },
              body: JSON.stringify(videoRequestBody)
            });

            if (videoCreateResponse.ok) {
              const videoData = await videoCreateResponse.json();
              console.log("✅ Video job created:", videoData.id);
              
              if (videoData.id) {
                // Poll for video completion
                console.log("⏳ Waiting for video generation (this may take 2-3 minutes)...");
                let videoAttempts = 0;
                const maxVideoAttempts = 180; // ~3 minutes with 3s intervals
                
                let videoProject;
                do {
                  await new Promise(r => setTimeout(r, 3000)); // wait 3 seconds
                  
                  const videoStatusResponse = await fetch(`https://api.magichour.ai/v1/video-projects/${videoData.id}`, {
                    headers: {
                      "accept": "application/json",
                      "authorization": `Bearer ${token}`
                    }
                  });

                  if (videoStatusResponse.ok) {
                    videoProject = await videoStatusResponse.json();
                    console.log(`🎥 Video status: ${videoProject.status || "processing..."} (attempt ${videoAttempts + 1})`);

                    if (videoProject.status === "completed" || videoProject.status === "complete") {
                      // Extract video URL
                      const videoOutputs = [
                        ...(videoProject.outputs || []),
                        ...(videoProject.frames || []),
                        ...(videoProject.downloads || [])
                      ];

                      if (videoOutputs.length > 0) {
                        videoUrl = videoOutputs[0].url || videoOutputs[0].output_url;
                        console.log("🎬 Video generated successfully:", videoUrl);
                      }
                      break;
                    }
                  }

                  videoAttempts++;
                  if (videoAttempts >= maxVideoAttempts) {
                    console.log("⏱️ Video generation timeout - returning image only");
                    break;
                  }
                } while (true);
              }
             } else {
               const errorText = await videoCreateResponse.text();
               console.error("❌ Video creation failed:", videoCreateResponse.status, errorText);
               console.log("⚠️ Video creation failed, continuing with image only");
             }
          } catch (videoError: any) {
            console.log("⚠️ Video generation error:", videoError.message, "- continuing with image only");
          }
          
          console.log("✅ Final response - Image URL:", imageUrl);
          console.log("✅ Final response - Video URL:", videoUrl);
          
          return NextResponse.json({
            success: true,
            prompt,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            useFallback: false,
            message: videoUrl ? "Image and video generated successfully!" : "Image generated successfully!",
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
