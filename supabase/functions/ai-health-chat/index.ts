import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    
    const systemPrompt = `You are MediCheck AI, a helpful and professional health assistant. 
    The user is asking follow-up questions about their recent symptom analysis.
    Context from analysis: ${JSON.stringify(context)}
    
    Provide concise, helpful, and empathetic health advice. 
    ALWAYS remind the user that you are an AI and not a doctor.
    If symptoms sound serious (breathing difficulty, chest pain, etc.), STRONGLY advise seeking immediate medical attention.`;

    // Securely retrieve key from environment
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured in Supabase secrets");
      return new Response(JSON.stringify({ error: "AI Service Configuration Error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content
          }))
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
