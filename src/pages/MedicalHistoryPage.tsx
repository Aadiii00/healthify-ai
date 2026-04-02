import { useEffect, useState } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Pill, StickyNote } from "lucide-react";

interface MedicalRecord {
  id: string;
  diagnosis: string;
  prescription: string | null;
  notes: string | null;
  created_at: string;
  doctors: { name: string; specialization: string } | null;
}

const MedicalHistoryPage = () => {
  const { patientId } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      supabase
        .from("medical_records")
        .select("id, diagnosis, prescription, notes, created_at, doctors(name, specialization)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setRecords(data as any);
          setLoading(false);
        });
    }
  }, [patientId]);

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 font-heading text-3xl font-bold">Medical History</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="mb-3 h-12 w-12" />
              <p className="text-lg font-medium">No medical records yet</p>
              <p className="text-sm">Your records will appear here after doctor consultations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {records.map(r => (
              <Card key={r.id} className="transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-heading font-semibold">Dr. {r.doctors?.name}</p>
                      <p className="text-sm text-muted-foreground">{r.doctors?.specialization}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Diagnosis</p>
                        <p className="text-sm">{r.diagnosis}</p>
                      </div>
                    </div>
                    {r.prescription && (
                      <div className="flex items-start gap-3">
                        <Pill className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Prescription</p>
                          <p className="text-sm">{r.prescription}</p>
                        </div>
                      </div>
                    )}
                    {r.notes && (
                      <div className="flex items-start gap-3">
                        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
                          <p className="text-sm">{r.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MedicalHistoryPage;
