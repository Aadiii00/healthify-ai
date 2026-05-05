import { useState } from 'react';

export type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

interface GroqOptions {
  model?: string;
  response_format?: { type: "json_object" };
}

export const useGroqAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCompletion = async (messages: GroqMessage[], options?: GroqOptions) => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Groq API key not found in environment.");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model || "llama-3.1-8b-instant",
          messages,
          response_format: options?.response_format,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API failed with status ${response.status}`);
      }

      const rawData = await response.json();
      const content = rawData.choices?.[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      return content;
    } catch (err: any) {
      console.error("Groq AI Error:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateCompletion, loading, error };
};
