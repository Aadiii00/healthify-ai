import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, X, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "ai";
  content: string;
}

export const HealthChatComponent = ({ context }: { context?: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-health-chat", {
        body: { messages: [...messages, userMsg], context },
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: "ai", content: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[350px] overflow-hidden shadow-2xl transition-all">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-primary py-3 text-primary-foreground">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Brain className="h-4 w-4" /> Healthify AI Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[350px] p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                <Brain className="mb-2 h-8 w-8" />
                <p className="text-xs">
                  Hi! I'm your Healthify AI assistant. How can I help you today?
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted text-foreground rounded-tl-none"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">AI thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t p-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="flex-1 text-xs"
            disabled={loading}
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};
