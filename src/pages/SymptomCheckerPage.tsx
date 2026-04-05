import { useState } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Loader2, 
  Activity, 
  Stethoscope, 
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HealthChatComponent } from "@/components/HealthChatComponent";

interface ConditionResult {
  disease: string;
  probability: number;
  description: string;
  severity: "mild" | "moderate" | "severe";
  recommendation: string;
}

interface AnalysisResponse {
  results: ConditionResult[];
  disclaimer: string;
  error?: string;
}

const commonSymptoms = [
  "Headache", "Fever", "Cough", "Fatigue", "Nausea",
  "Sore throat", "Body aches", "Dizziness", "Chest pain",
  "Shortness of breath", "Runny nose", "Abdominal pain",
];

const SymptomCheckerPage = () => {
  const [symptoms, setSymptoms] = useState("");
  const [analysisResults, setAnalysisResults] = useState<ConditionResult[] | null>(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(false);
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
    setAnalysisResults(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: symptoms.trim() }),
      });

      if (!response.ok) {
        throw new Error(`API failed with status ${response.status}`);
      }

      const data: AnalysisResponse = await response.json();
      
      if (data.error) {
        toast({ title: "Validation Error", description: data.error, variant: "destructive" });
      } else {
        setAnalysisResults(data.results);
        setDisclaimer(data.disclaimer);
        toast({ title: "Analysis Complete", description: "AI has successfully analyzed your symptoms." });
      }

    } catch (err: any) {
      console.error("Analysis Error:", err);
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSymptoms("");
    setAnalysisResults(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "severe": return "bg-destructive/10 text-destructive border-destructive/20";
      case "moderate": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "mild": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-medical shadow-xl transform hover:scale-105 transition-transform">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 mb-4">Clinical AI Symptom Checker</h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
            Get instant, AI-driven diagnostic insights by describing your symptoms. Our advanced model analyzes patterns to provide specialized health guidance.
          </p>
        </div>

        {!analysisResults ? (
          <Card className="border-none shadow-premium bg-white/80 backdrop-blur-sm overflow-hidden anim-fade-in relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-medical" />
            <CardHeader className="pt-10 pb-6 px-10">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Describe your condition
              </CardTitle>
              <CardDescription className="text-base">
                Select from common symptoms or describe how you feel in your own words.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 px-10 pb-12">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Common Symptoms</p>
                <div className="flex flex-wrap gap-2.5">
                  {commonSymptoms.map(s => {
                    const active = symptoms.split(",").map(x => x.trim()).includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSymptom(s)}
                        className={`rounded-xl border-2 px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                          active
                            ? "border-primary bg-primary text-white shadow-lg scale-105"
                            : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-primary/40 hover:bg-white"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Detailed Description</p>
                <div className="relative group">
                  <Textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe your symptoms, their duration, and any discomfort you're experiencing..."
                    className="min-h-[160px] text-lg p-6 rounded-2xl border-2 border-slate-100 focus:border-primary/50 transition-all bg-slate-50/30 group-hover:bg-white resize-none"
                  />
                  {!symptoms && (
                    <div className="absolute bottom-6 right-6 flex items-center gap-2 text-slate-300 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50">
                      <Stethoscope className="h-5 w-5" />
                      <span className="text-sm font-medium">Type to analyze</span>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={analyze} 
                disabled={loading} 
                className="w-full h-16 rounded-2xl text-xl font-bold transition-all shadow-xl hover:shadow-primary/20 active:scale-[0.98]" 
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin text-white" /> 
                    Analysis in Progress...
                  </>
                ) : (
                  <>
                    <Brain className="mr-3 h-6 w-6 text-white" /> 
                    Start AI Diagnostic
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10 anim-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-3xl font-bold text-slate-900">Diagnostic Insights</h2>
                <p className="text-slate-500 mt-1">Based on your reported symptoms: <span className="font-semibold text-primary">{symptoms}</span></p>
              </div>
              <Button variant="outline" onClick={reset} className="rounded-xl px-6 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold h-12 flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> Reset Analysis
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
              {analysisResults.map((result, idx) => (
                <Card 
                  key={idx} 
                  className="group relative overflow-hidden border-none shadow-premium bg-white hover:shadow-2xl transition-all duration-500 rounded-3xl"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <div className={`absolute top-0 left-0 w-2 h-full ${
                    result.severity === "severe" ? "bg-destructive" : result.severity === "moderate" ? "bg-orange-500" : "bg-emerald-500"
                  }`} />
                  
                  <CardHeader className="px-8 pt-8 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                      <Badge className={`rounded-xl px-4 py-1.5 text-sm font-bold border-2 ${getSeverityColor(result.severity)}`}>
                        {result.severity.toUpperCase()} SEVERITY
                      </Badge>
                      <div className="flex items-center gap-3 text-slate-400 font-bold bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="text-sm tracking-wide uppercase">Confidence Score: {result.probability}%</span>
                      </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-3">
                      {result.disease}
                      <ArrowRight className="h-6 w-6 text-primary opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="px-8 pb-8 space-y-8">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-500 uppercase tracking-widest">
                        <span>Analysis Probability</span>
                        <span>{result.probability}%</span>
                      </div>
                      <Progress 
                        value={result.probability} 
                        className={`h-2.5 rounded-full ${
                          result.severity === "severe" ? "bg-slate-100 [&>div]:bg-destructive" : 
                          result.severity === "moderate" ? "bg-slate-100 [&>div]:bg-orange-500" : 
                          "bg-slate-100 [&>div]:bg-emerald-500"
                        }`}
                      />
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100/50">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                          <Info className="h-5 w-5 text-primary" /> Clinical Description
                        </h4>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {result.description}
                        </p>
                      </div>
                      <div className="space-y-3 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                        <h4 className="font-bold text-primary flex items-center gap-2 text-lg">
                          <CheckCircle className="h-5 w-5 text-primary" /> Next Steps & Advice
                        </h4>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {result.recommendation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 rounded-3xl border-2 border-warning/20 bg-warning/5 p-10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-warning/20 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-warning" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-warning-700 flex items-center gap-2">
                  Medical Disclaimer
                </h3>
                <p className="text-slate-600 text-lg leading-relaxed font-medium">
                  {disclaimer || "This AI tool is for educational purposes only. It cannot replace a professional medical consultation. If you are experiencing an emergency, please contact 911 or visit your nearest emergency room immediately."}
                </p>
              </div>
            </div>

            <Card className="rounded-3xl border-none shadow-premium bg-slate-900 text-white overflow-hidden p-8 md:p-12 relative">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold items-center gap-2">Ready to talk to a professional?</h3>
                    <p className="text-slate-300 text-lg max-w-lg">
                      Our health assistants are available 24/7 to provide more detailed context and personalized support.
                    </p>
                  </div>
                  <Button size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold bg-white text-slate-900 hover:bg-slate-100 flex items-center gap-3">
                    Consult an Assistant <ChevronRight className="h-5 w-5" />
                  </Button>
               </div>
            </Card>
          </div>
        )}
      </div>
      <HealthChatComponent context={{ symptoms, analysis: JSON.stringify(analysisResults) }} />
    </MainLayout>
  );
};

export default SymptomCheckerPage;
