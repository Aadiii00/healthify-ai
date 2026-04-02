import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Users, FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppointmentRow {
  id: string;
  appointment_date: string;
  status: string;
  patients: { name: string; email: string } | null;
}

export const DoctorDashboard = () => {
  const { doctorId } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (doctorId) fetchAppointments();
  }, [doctorId]);

  const fetchAppointments = async () => {
    if (!doctorId) return;
    const { data } = await supabase
      .from("appointments")
      .select("id, appointment_date, status, patients(name, email)")
      .eq("doctor_id", doctorId)
      .order("appointment_date", { ascending: false });
    if (data) setAppointments(data as any);
  };

  const addRecord = async () => {
    if (!selectedAppointment || !doctorId || !diagnosis) return;
    setLoading(true);
    try {
      // Get patient_id from the appointment
      const { data: apt } = await supabase.from("appointments").select("patient_id").eq("id", selectedAppointment.id).single();
      if (!apt) throw new Error("Appointment not found");

      const { error } = await supabase.from("medical_records").insert({
        patient_id: apt.patient_id,
        doctor_id: doctorId,
        diagnosis,
        prescription: prescription || null,
        notes: notes || null,
      });
      if (error) throw error;

      // Update appointment status
      await supabase.from("appointments").update({ status: "completed" }).eq("id", selectedAppointment.id);

      toast({ title: "Record added successfully" });
      setDiagnosis(""); setPrescription(""); setNotes(""); setSelectedAppointment(null);
      fetchAppointments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{appointments.length}</p>
              <p className="text-sm text-muted-foreground">Total Appointments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Users className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{appointments.filter(a => a.status === "pending").length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <FileText className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{appointments.filter(a => a.status === "completed").length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No appointments yet</p>
          ) : (
            <div className="space-y-3">
              {appointments.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-semibold">{a.patients?.name}</p>
                    <p className="text-sm text-muted-foreground">{a.patients?.email}</p>
                    <p className="text-sm">
                      {new Date(a.appointment_date).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      a.status === "completed" ? "bg-success/10 text-success" :
                      a.status === "pending" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>{a.status}</span>
                    {a.status === "pending" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedAppointment(a)}>
                            <Plus className="mr-1 h-3 w-3" /> Add Notes
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Diagnosis & Notes</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Diagnosis</Label>
                              <Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} required />
                            </div>
                            <div>
                              <Label>Prescription</Label>
                              <Textarea value={prescription} onChange={e => setPrescription(e.target.value)} />
                            </div>
                            <div>
                              <Label>Notes</Label>
                              <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                            <Button onClick={addRecord} disabled={loading} className="w-full">
                              {loading ? "Saving..." : "Save Record"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
