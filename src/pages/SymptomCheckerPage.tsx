import { useState } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
        body: { symptoms },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      setDisclaimer(data.disclaimer || "");
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
    if (p >= 40) return "text-warning";
    return "text-success";
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-medical">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold">AI Symptom Checker</h1>
          <p className="text-muted-foreground">Describe your symptoms to get AI-powered health insights</p>
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
    </MainLayout>
  );
};

export default SymptomCheckerPage;
