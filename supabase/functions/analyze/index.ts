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
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    
    if (!GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error", detail: "Internal AI gateway key is not set." }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: "Analyze these symptoms medically and give possible causes and advice: " + symptoms
            }
          ]
        })
      }
    );

    // 4. Handle errors properly
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API Error (Status ${response.status}):`, errorText);
      console.error(`Key used (first 5): ${GROQ_API_KEY.substring(0, 5)}`);
      return new Response(
        JSON.stringify({ error: "Groq API failed", detail: errorText }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "No analysis available.";

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
