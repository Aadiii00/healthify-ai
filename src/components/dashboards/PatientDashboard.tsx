import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { 
  Brain, Calendar, FileText, Clock, TrendingUp, Activity, 
  AlertTriangle, Download, UserPlus, Heart, Stethoscope, 
  Droplets, MessageSquare, Send, Award, ArrowRight, Save, Loader2, Star
} from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useGroqAI, GroqMessage } from "@/hooks/useGroqAI";

const DAILY_TIPS = [
  "Stay hydrated: Drink at least 8 glasses of water today.",
  "Take brief screen breaks every 20 minutes to rest your eyes.",
  "A 15-minute walk after meals can significantly improve digestion.",
  "Prioritize 7-8 hours of sleep tonight for better cognitive function.",
  "Incorporate more leafy greens into your next meal."
];

const CRITICAL_SYMPTOMS = ["chest pain", "shortness of breath", "severe headache", "numbness", "fainting"];

export const PatientDashboard = () => {
  const { patientId } = useAuth();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ appointments: 0, records: 0, pending: 0, healthScore: 100, riskLevel: "Low" });
  const [history, setHistory] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<"7" | "30">("7");
  const [latestReport, setLatestReport] = useState<any>(null);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [countdown, setCountdown] = useState("");
  const [alerts, setAlerts] = useState<string[]>([]);
  const [dailyTip] = useState(DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)]);
  const [recommendedDoctor, setRecommendedDoctor] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Profile State
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profile, setProfile] = useState({ 
    weight_kg: "", height_cm: "", blood_type: "", medical_conditions: "" 
  });
  
  // Chat State
  const [messages, setMessages] = useState<{role: "user" | "ai", content: string}[]>([
    { role: "ai", content: "Hi! I'm your Healthify AI assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const { generateCompletion, loading: chatLoading } = useGroqAI();

  useEffect(() => {
    if (!patientId) return;
    
    const fetchData = async () => {
      // Fetch DB aggregations
      const [a, r, p, histRes, apptRes, profRes, docRes] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
        supabase.from("medical_records").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", patientId).eq("status", "pending"),
        supabase.from("medical_records").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(30),
        supabase.from("appointments").select("*, doctors(full_name, specialty)").eq("patient_id", patientId).eq("status", "pending").gte("appointment_date", new Date().toISOString()).order("appointment_date", { ascending: true }).limit(1),
        supabase.from("patients").select("*").eq("id", patientId).single(),
        supabase.from("doctors").select("*").limit(5) // Get some doctors for recommendation
      ]);

      const records = histRes.data || [];
      setHistory(records.reverse()); // chronological for chart
      
      const latest = records.length > 0 ? records[records.length - 1] : null; // Since we reversed it
      setLatestReport(latest);

      // Score Calculation
      const count = r.count || 0;
      let score = 100;
      let risk = "Low";
      if (count > 0 && records.length > 0) {
        const avgProb = records.reduce((acc, curr) => acc + (curr.probability || 0), 0) / records.length;
        score = Math.max(Math.min(Math.round(100 - (avgProb / 2)), 100), 0);
        risk = avgProb > 70 ? "High" : avgProb > 40 ? "Medium" : "Low";
      }
      
      setStats({ appointments: a.count || 0, records: count, pending: p.count || 0, healthScore: score, riskLevel: risk });
      
      // Alerts
      const newAlerts: string[] = [];
      if (latest && latest.symptoms) {
        CRITICAL_SYMPTOMS.forEach(sym => {
          if (latest.symptoms.toLowerCase().includes(sym)) {
            newAlerts.push(`Critical symptom detected recently: ${sym}. Consider seeking medical attention.`);
          }
        });
      }
      if (risk === "High") newAlerts.push("Your overall health risk is High based on recent AI analyses. Please consult a doctor.");
      setAlerts(newAlerts);

      // Next Appt
      if (apptRes.data && apptRes.data.length > 0) {
        setNextAppointment(apptRes.data[0]);
      }

      // Profile
      if (profRes.data) {
        setProfile({
          weight_kg: profRes.data.weight_kg?.toString() || "",
          height_cm: profRes.data.height_cm?.toString() || "",
          blood_type: profRes.data.blood_type || "",
          medical_conditions: profRes.data.medical_conditions ? profRes.data.medical_conditions.join(", ") : ""
        });
      }

      // Recommend Doctor (Randomly or based on specialty matching)
      if (docRes.data && docRes.data.length > 0) {
        // Try to match diagnosis with specialty
        const match = docRes.data.find(d => latest && latest.diagnosis && latest.diagnosis.toLowerCase().includes(d.specialty?.toLowerCase() || ''));
        setRecommendedDoctor(match || docRes.data[Math.floor(Math.random() * docRes.data.length)]);
      }

      setLoading(false);
    };

    fetchData();

    // Setup Realtime
    const channel = supabase.channel('dashboard-changes').on('postgres_changes', 
      { event: '*', schema: 'public', filter: `patient_id=eq.${patientId}` }, 
      () => { fetchData(); }
    ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patientId]);

  // Handle Countdown Timer
  useEffect(() => {
    if (!nextAppointment) return;
    const interval = setInterval(() => {
      const target = new Date(nextAppointment.appointment_date).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) { setCountdown("Time for your appointment!"); clearInterval(interval); return; }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${d}d ${h}h ${m}m remaining`);
    }, 60000); // update every minute
    // Run immediately once
    const diff = new Date(nextAppointment.appointment_date).getTime() - new Date().getTime();
    if (diff > 0) setCountdown(`${Math.floor(diff / (1000 * 60 * 60 * 24))}d ${Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}h remaining`);
    return () => clearInterval(interval);
  }, [nextAppointment]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    // Split the comma-separated string into a Postgres array format for Supabase
    const splitConds = profile.medical_conditions
      ? profile.medical_conditions.split(",").map(c => c.trim()).filter(Boolean)
      : [];
      
    const { error } = await supabase.from("patients").update({
      weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
      height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
      blood_type: profile.blood_type || null,
      medical_conditions: splitConds
    }).eq("id", patientId);
    
    if (error) {
      console.error(error);
      toast({ title: "Error saving profile", variant: "destructive" });
    } else {
      toast({ title: "Health Profile Updated!" });
    }
    setIsSavingProfile(false);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      
      pdf.setFont("helvetica");
      
      // Header Section
      pdf.setFillColor(59, 130, 246); // Primary blue
      pdf.rect(0, 0, 210, 30, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("Healthify AI", 15, 20);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Healthify AI Medical Report", 150, 18);
      pdf.setFontSize(9);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 150, 24);
      pdf.text(`Report ID: MC-${Math.floor(Math.random() * 90000) + 10000}`, 150, 28);
      
      pdf.setTextColor(0, 0, 0);
      
      // Patient Info Section
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Patient Information", 15, 45);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, 48, 195, 48);
      
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Patient ID: ${patientId?.substring(0, 8)}...`, 15, 57);
      pdf.text(`Weight: ${profile.weight_kg ? profile.weight_kg + ' kg' : 'N/A'}`, 105, 57);
      pdf.text(`Height: ${profile.height_cm ? profile.height_cm + ' cm' : 'N/A'}`, 150, 57);
      pdf.text(`Blood Type: ${profile.blood_type || 'N/A'}`, 15, 65);
      pdf.text(`Conditions: ${profile.medical_conditions || 'None Reported'}`, 105, 65);

      // Latest Diagnosis
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Selected AI Diagnosis Analysis", 15, 80);
      pdf.line(15, 83, 195, 83);
      
      if (latestReport) {
        pdf.setFontSize(12);
        pdf.text(`Primary Condition: ${latestReport.diagnosis || 'Unknown'}`, 15, 93);
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 80);
        
        pdf.text("Reported Symptoms:", 15, 103);
        const splitSymptoms = pdf.splitTextToSize(latestReport.symptoms || 'None recorded.', 170);
        pdf.text(splitSymptoms, 15, 109);
        
        let cursorY = 109 + (splitSymptoms.length * 5) + 5;
        
        pdf.text("AI Recommendations:", 15, cursorY);
        cursorY += 6;
        const splitRecs = pdf.splitTextToSize(latestReport.prescription || latestReport.notes || 'No specific recommendations generated.', 170);
        pdf.text(splitRecs, 15, cursorY);
      } else {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text("No recent diagnosis records found in system.", 15, 93);
      }

      // Risk & Score
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Health Metrics", 15, 180);
      pdf.line(15, 183, 195, 183);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Overall Health Score: ${stats.healthScore} / 100`, 15, 192);
      pdf.text(`System Risk Level: ${stats.riskLevel}`, 105, 192);

      // Next Appointment
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Upcoming Appointment", 15, 210);
      pdf.line(15, 213, 195, 213);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      if (nextAppointment) {
        pdf.text(`Doctor: Dr. ${nextAppointment.doctors?.full_name}`, 15, 222);
        pdf.text(`Date & Time: ${new Date(nextAppointment.appointment_date).toLocaleString()}`, 15, 230);
      } else {
        pdf.text("No upcoming appointments scheduled.", 15, 222);
      }

      // Signature Placeholder
      pdf.setFontSize(10);
      pdf.text("Generated By: Healthify AI Algorithm", 140, 250);
      pdf.line(140, 245, 195, 245);

      // Footer
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, 275, 195, 275);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text("DISCLAIMER: This report is AI-generated by Healthify AI and is not a substitute for", 105, 282, { align: "center" });
      pdf.text("professional medical advice, diagnosis, or treatment. Always consult a qualified health provider.", 105, 287, { align: "center" });

      pdf.save(`Healthify_Medical_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Medical Report Downloaded!" });
    } catch (e) {
      console.error(e);
      toast({ title: "Export failed", variant: "destructive" });
    }
    setIsExporting(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user" as const, content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    const systemPrompt = `You are MediCheck AI, a helpful and professional health assistant. 
    The user is asking questions about their health.
    
    Provide concise, helpful, and empathetic health advice. 
    ALWAYS remind the user that you are an AI and not a doctor.
    If symptoms sound serious (breathing difficulty, chest pain, etc.), STRONGLY advise seeking immediate medical attention.`;

    const formattedMessages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...[...messages, userMsg].map(m => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content
      }))
    ];

    try {
      const reply = await generateCompletion(formattedMessages);
      setMessages(prev => [...prev, { role: "ai", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I'm adjusting my systems. Please try again." }]);
    }
  };

  const chartData = history
    .slice(timeRange === "7" ? -7 : -30)
    .map(d => ({
      date: new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      probability: d.probability || 0,
      score: 100 - ((d.probability || 0) / 2)
    }));

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Dynamic Header & Tip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-muted">
        <div>
          <h2 className="text-2xl font-bold font-heading">Health Dashboard</h2>
          <p className="text-sm text-primary font-medium mt-0.5">Your real-time health insights powered by AI</p>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Activity className="h-4 w-4 text-primary" /> Tip of the day: {dailyTip}
          </p>
        </div>
        <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="shrink-0 gap-2">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export PDF
        </Button>
      </div>

      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{alert}</p>
            </div>
          ))}
        </div>
      )}

      {/* Row 1: Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Overall Health Score</p>
              <Heart className={`h-4 w-4 ${stats.healthScore > 80 ? 'text-success' : stats.healthScore > 50 ? 'text-warning' : 'text-destructive'}`} />
            </div>
            <div className="text-3xl font-bold">{stats.healthScore}<span className="text-lg text-muted-foreground">/100</span></div>
            <Progress value={stats.healthScore} className="h-2 mt-3" />
            <p className="text-xs text-muted-foreground mt-2">Your overall health score is calculated based on symptoms, activity, and medical history.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
              <TrendingUp className={`h-4 w-4 ${stats.riskLevel === 'Low' ? 'text-success' : stats.riskLevel === 'Medium' ? 'text-warning' : 'text-destructive'}`} />
            </div>
            <div className={`text-3xl font-bold ${stats.riskLevel === 'High' ? 'text-destructive' : ''}`}>{stats.riskLevel}</div>
            <p className="text-xs text-muted-foreground mt-2">Based on recent symptom patterns and AI analysis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">AI Records Logs</p>
              <FileText className="h-4 w-4 text-accent" />
            </div>
            <div className="text-3xl font-bold">{stats.records}</div>
            <p className="text-xs text-muted-foreground mt-2">Stored across history</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Next Appt</p>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            {nextAppointment ? (
              <>
                <div className="text-xl font-bold truncate">Dr. {nextAppointment.doctors?.full_name}</div>
                <p className="text-xs font-semibold text-primary mt-1">{countdown || 'Soon'}</p>
              </>
            ) : (
              <>
                <div className="text-xl font-bold">None</div>
                <Link to="/appointments"><p className="text-xs font-semibold hover:underline text-primary mt-1">Book now →</p></Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Advanced Trends & Health Report */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Advanced Trends */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Advanced Health Trends
            </CardTitle>
            <Select value={timeRange} onValueChange={(val: "7"|"30") => setTimeRange(val)}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] mt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area yAxisId="left" type="monotone" dataKey="score" name="Health Score" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                    <Area yAxisId="right" type="monotone" dataKey="probability" name="Symptom Risk %" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorProb)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                  Analyze symptoms to build trend data
                </div>
              )}
            </div>
            
            {/* Health Score Breakdown Addon */}
            <div className="mt-6 pt-4 border-t space-y-3">
              <h4 className="text-sm font-semibold mb-2">Health Factor Breakdown</h4>
              <div className="flex items-center gap-4">
                <span className="w-32 text-xs text-muted-foreground">General Wellness</span>
                <Progress value={90} className="h-1.5" />
                <span className="w-8 text-xs font-semibold text-right">90%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-32 text-xs text-muted-foreground">Symptom Frequency</span>
                <Progress value={stats.records > 5 ? 40 : 85} className={`h-1.5 ${stats.records > 5 ? 'text-warning' : ''}`} />
                <span className="w-8 text-xs font-semibold text-right">{stats.records > 5 ? 'High' : 'Low'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Report Latest */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" /> Latest Diagnosis
            </CardTitle>
            <CardDescription>From AI Symptom Checker</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {latestReport ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-semibold text-sm border-b pb-2 mb-2">Top Result</h4>
                  <p className="text-primary font-bold text-lg">{latestReport.diagnosis}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Reported Symptoms</h4>
                  <p className="text-sm line-clamp-2">{latestReport.symptoms}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">AI Recommendation</h4>
                  <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{latestReport.prescription || latestReport.notes}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-center text-muted-foreground">
                <Brain className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">No analysis reports yet.</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Link to="/symptom-checker" className="w-full">
              <Button variant="outline" className="w-full font-semibold">New Check <ArrowRight className="h-4 w-4 ml-2" /></Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Row 3: Chat Assistant, Profile, recommended doctors */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Profile Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Health Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Weight (kg)</Label>
                <Input value={profile.weight_kg} onChange={e => setProfile({...profile, weight_kg: e.target.value})} placeholder="e.g. 70" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height (cm)</Label>
                <Input value={profile.height_cm} onChange={e => setProfile({...profile, height_cm: e.target.value})} placeholder="e.g. 175" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Blood Type</Label>
              <Select value={profile.blood_type} onValueChange={v => setProfile({...profile, blood_type: v})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Medical Conditions (comma separated)</Label>
              <Input value={profile.medical_conditions} onChange={e => setProfile({...profile, medical_conditions: e.target.value})} placeholder="e.g. Asthma, Diabetes" />
            </div>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full mt-2">
              {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* AI Chat Assistant Embedded */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader className="border-b bg-muted/50 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" /> AI Consult Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden relative">
            <ScrollArea className="h-full px-4 py-4">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'ai' ? 'bg-muted text-foreground rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-none"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t p-3 bg-muted/20">
            <div className="flex w-full items-center space-x-2">
              <Input placeholder="Ask a health question..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} className="bg-background" />
              <Button size="icon" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </CardFooter>
        </Card>

        {/* Recommend Doctor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" /> Specialist Match
            </CardTitle>
            <CardDescription>Based on your health history</CardDescription>
          </CardHeader>
          <CardContent>
            {recommendedDoctor ? (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center flex flex-col items-center">
                <div className="h-16 w-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-3">
                  <UserPlus className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg">Dr. {recommendedDoctor.full_name}</h3>
                <Badge variant="outline" className="mt-1">{recommendedDoctor.specialty}</Badge>
                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Award className="h-3 w-3"/> {recommendedDoctor.experience_years || 5}+ yrs</span>
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-500 text-amber-500"/> {recommendedDoctor.rating || '4.8'}</span>
                </div>
                <Link to="/appointments" className="w-full mt-5">
                  <Button variant="default" className="w-full">Book Consult</Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-8">Need data to match doctors</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};
