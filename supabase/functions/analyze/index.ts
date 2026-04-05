import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-goog-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { symptoms } = await req.json();

    // 7. If symptoms are empty
    if (!symptoms || symptoms.trim() === "") {
      return new Response(
        JSON.stringify({ analysis: "Please enter symptoms" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Retrieve key from Supabase secrets
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error", detail: "Internal AI gateway key is not set." }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Analyze these symptoms medically and give possible causes and advice: " + symptoms
                }
              ]
            }
          ]
        })
      }
    );

    // 4. Handle errors properly
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error (Status ${response.status}):`, errorText);
      console.error(`Key used (first 5): ${GEMINI_API_KEY.substring(0, 5)}`);
      return new Response(
        JSON.stringify({ error: "Gemini API failed", detail: errorText }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis available.";

    // 5. Return response format
    // 8. Always return status 200 on success
    return new Response(
      JSON.stringify({ analysis: aiText }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err) {
    // 6. Add try-catch: Log error in console, never crash the function
    console.error("Internal Server Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
