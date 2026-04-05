import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Brain, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { sendNotification, RECIPIENT_PHONE } from "@/lib/webhook";

export const SymptomFormSection = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update email if user logs in/out while on page
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !symptoms) return;

    setLoading(true);
    setError(null);

    try {
      // Explicitly fetch the logged-in user email at the time of submission
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email || email || "user@gmail.com";

      await sendNotification(RECIPIENT_PHONE, symptoms, userEmail);

      setSubmitted(true);
      setEmail("");
      setSymptoms("");
    } catch (err: any) {
      console.error("Submission error:", err);
      setError("There was a problem submitting your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-background relative overflow-hidden" id="symptom-analysis">
      {/* Background soft glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Brain className="w-4 h-4" /> AI Diagnostics
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4 text-foreground">
            Get Instant AI-Powered Health Guidance
          </h2>
          <p className="text-muted-foreground text-lg">
            Describe your symptoms below and our AI will provide personalized insights and recommendations.
          </p>
        </div>

        <Card className="max-w-xl mx-auto border-border shadow-2xl shadow-primary/5 bg-card overflow-hidden transition-all duration-300 hover:shadow-primary/10">
          <CardHeader className="bg-primary/5 border-b border-border/50 py-6">
            <CardTitle className="text-xl font-heading text-center">Symptom Analysis Form</CardTitle>
            <CardDescription className="text-center">Enter your details for a quick analysis</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                <p className="text-muted-foreground mb-6">
                  Your request has been submitted. We will follow up soon.
                </p>
                <Button 
                  onClick={() => setSubmitted(false)} 
                  variant="outline"
                  className="rounded-full px-8"
                >
                  Submit Another Request
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground ml-1">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={!!user?.email}
                    className={`rounded-xl border-border bg-background focus:ring-primary/20 focus:border-primary transition-all duration-200 ${user?.email ? "bg-muted cursor-not-allowed opacity-75" : ""}`}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="symptoms" className="text-sm font-medium text-foreground ml-1">
                    Describe Symptoms
                  </label>
                  <Textarea
                    id="symptoms"
                    required
                    placeholder="Describe your symptoms (e.g., persistent cough, fatigue, headache...)"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="min-h-[120px] rounded-xl border-border bg-background focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-md font-semibold transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" /> Analyze & Submit
                    </div>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-4 italic">
                  "This is AI-based guidance and not a medical diagnosis."
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
