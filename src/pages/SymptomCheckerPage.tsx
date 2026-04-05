import { useState } from "react";
import { sendNotification, RECIPIENT_PHONE } from "@/lib/webhook";

import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HealthChatComponent } from "@/components/HealthChatComponent";

interface AnalysisResult {
  disease: string;
  probability: number;
  description: string;
  severity: string;
  recommendation: string;
}

const commonSymptoms = [
  "Headache", "Fever", "Cough", "Fatigue", "Nausea",
  "Sore throat", "Body aches", "Dizziness", "Chest pain",
  "Shortness of breath", "Runny nose", "Abdominal pain",
];

const SymptomCheckerPage = () => {
  const [symptoms, setSymptoms] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [disclaimer, setDisclaimer] = useState("");
  const { toast } = useToast();

  const toggleSymptom = (s: string) => {
    const current = symptoms.split(",").map(x => x.trim()).filter(Boolean);
    if (current.includes(s)) {
      setSymptoms(current.filter(x => x !== s).join(", "));
    } else {
      setSymptoms([...current, s].join(", "));
    }
  };

  const analyze = async () => {
    if (!symptoms.trim()) {
      toast({ title: "Please enter symptoms", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-symptoms-ai", {
        body: { symptoms: symptoms.trim() },
      });

      if (error) throw error;
      if (!data?.results) throw new Error("No response content from AI");

      const analysisResults = data.results as AnalysisResult[];
      setResults(analysisResults);
      setDisclaimer(data.disclaimer);

      // Check for serious symptoms
      const hasSevere = analysisResults.some(r => r.severity.toLowerCase() === "severe");
      if (hasSevere) {
        toast({
          title: "Urgent: Serious Symptoms Detected",
          description: "One or more identified conditions are marked as severe. Please seek medical attention immediately.",
          variant: "destructive",
        });
      }

      // Save the top result to medical records automatically
      if (analysisResults.length > 0) {
        const topResult = analysisResults[0];
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          // Get patient_id
          const { data: patient } = await supabase
            .from("patients")
            .select("id")
            .eq("user_id", userData.user.id)
            .maybeSingle();

          if (patient) {
            const { error: saveError } = await supabase.from("medical_records").insert({
              patient_id: patient.id,
              diagnosis: topResult.disease,
              notes: topResult.description,
              symptoms: symptoms.trim(),
              probability: topResult.probability,
              prescription: topResult.recommendation,
            });

            if (saveError) {
              console.error("Failed to save record:", saveError);
              toast({ title: "Note saved to UI", description: "Analysis successful but failed to save to history.", variant: "destructive" });
            } else {
              toast({ title: "Analysis Saved", description: "Your symptoms and analysis have been added to your medical records." });
              
              // 1. Send Notification for Diagnosis
              const userEmail = userData.user.email || "user@gmail.com";
              sendNotification(RECIPIENT_PHONE, `Your diagnosis result: ${topResult.disease}. Please take necessary precautions.`, userEmail);

              // 2. Health Alerts Logic (Repeated symptoms)
              // Fetch records from the last 7 days
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
              const { data: recentRecords } = await supabase
                .from("medical_records")
                .select("id, diagnosis")
                .eq("patient_id", patient.id)
                .gte("created_at", sevenDaysAgo);

              if (recentRecords) {
                const sameSymptomCount = recentRecords.filter(r => 
                  r.diagnosis.toLowerCase().includes(topResult.disease.toLowerCase()) ||
                  topResult.disease.toLowerCase().includes(r.diagnosis.toLowerCase())
                ).length;

                if (sameSymptomCount >= 3) {
                  sendNotification(RECIPIENT_PHONE, "You reported symptoms multiple times. Please consult a doctor.", userEmail);
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case "severe": return "destructive";
      case "moderate": return "secondary";
      default: return "outline";
    }
  };

  const probColor = (p: number) => {
    if (p >= 70) return "text-destructive";
    if (p >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-medical">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold">AI Symptom Checker</h1>
          <p className="text-muted-foreground mt-2 text-lg">Describe your symptoms and get instant AI-powered insights</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Select or describe your symptoms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {commonSymptoms.map(s => {
                const active = symptoms.split(",").map(x => x.trim()).includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/50"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <Textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g., fever, headache, sore throat, body aches..."
              className="min-h-[100px]"
            />
            <Button onClick={analyze} disabled={loading} className="w-full shadow-medical" size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" /> Analyze Symptoms
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Analysis Results</h2>
            {results.map((r, i) => (
              <Card key={i} className="overflow-hidden border-border/50 transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="font-heading text-lg font-semibold">{r.disease}</h3>
                        <Badge variant={severityColor(r.severity)}>{r.severity}</Badge>
                      </div>
                      <p className="mb-3 text-sm text-muted-foreground">{r.description}</p>
                      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-sm">{r.recommendation}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-heading text-3xl font-bold ${probColor(r.probability)}`}>
                        {r.probability}%
                      </span>
                      <p className="text-xs text-muted-foreground">probability</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {disclaimer && (
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <p className="text-sm text-muted-foreground">{disclaimer}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <HealthChatComponent context={{ symptoms, results }} />
    </MainLayout>
  );
};

export default SymptomCheckerPage;
