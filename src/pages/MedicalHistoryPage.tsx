import { useEffect, useState, useRef } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Pill, StickyNote, Download, Activity, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { HealthChatComponent } from "@/components/HealthChatComponent";

interface MedicalRecord {
  id: string;
  diagnosis: string;
  prescription: string | null;
  notes: string | null;
  symptoms: string | null;
  probability: number | null;
  created_at: string;
  doctors: { name: string; specialization: string } | null;
}

const MedicalHistoryPage = () => {
  const { patientId } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (patientId) {
      supabase
        .from("medical_records")
        .select("id, diagnosis, prescription, notes, symptoms, probability, created_at, doctors(name, specialization)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setRecords(data as any);
          setLoading(false);
        });
    }
  }, [patientId]);

  const downloadPDF = async (id: string) => {
    const element = document.getElementById(`record-${id}`);
    if (!element) return;
    
    // Hide buttons during capture
    const buttons = element.querySelectorAll("button");
    buttons.forEach(b => b.style.display = "none");
    
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`medical-report-${id.substring(0, 8)}.pdf`);
    
    buttons.forEach(b => b.style.display = "");
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Your Health History</h1>
            <p className="text-muted-foreground mt-2 text-lg">Track all your past diagnoses and reports in one place</p>
          </div>
          <Activity className="h-8 w-8 text-primary/50" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="mb-3 h-12 w-12" />
              <p className="text-lg font-medium">No medical records yet</p>
              <p className="text-sm">Your records will appear here after AI analysis or doctor consultations</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/symptom-checker'}>
                Try AI Symptom Checker
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {records.map(r => (
              <Card key={r.id} id={`record-${r.id}`} className="overflow-hidden transition-all hover:shadow-lg">
                <CardContent className="p-0">
                  <div className="bg-muted px-6 py-4 flex items-center justify-between border-b">
                    <div className="flex items-center gap-2">
                      {r.doctors ? (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Brain className="h-5 w-5 text-purple-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-heading font-semibold text-sm">
                          {r.doctors ? `Dr. ${r.doctors.name}` : "AI Analysis (Healthify AI)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.doctors ? r.doctors.specialization : "Automated Health Insight"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-medium text-muted-foreground bg-white px-2 py-1 rounded border">
                        {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => downloadPDF(r.id)} title="Download Report">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Activity className="h-3 w-3" /> Symptoms Reported
                          </div>
                          <p className="text-sm font-medium">{r.symptoms || "N/A"}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Brain className="h-3 w-3" /> Diagnosis
                          </div>
                          <p className="text-lg font-bold text-primary">{r.diagnosis}</p>
                          {r.probability && (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex justify-between text-xs font-medium">
                                <span>Confidence</span>
                                <span>{r.probability}%</span>
                              </div>
                              <Progress value={r.probability} className="h-1.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {r.prescription && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <Pill className="h-3 w-3" /> Recommendation
                            </div>
                            <div className="text-sm bg-accent/10 p-3 rounded-lg border border-accent/20">
                              {r.prescription}
                            </div>
                          </div>
                        )}
                        
                        {r.notes && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <StickyNote className="h-3 w-3" /> Clinical Notes
                            </div>
                            <p className="text-sm text-muted-foreground italic">"{r.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <HealthChatComponent />
    </MainLayout>
  );
};

export default MedicalHistoryPage;
