import { useEffect, useState } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Loader2 } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  doctors: { name: string; specialization: string } | null;
}

const AppointmentsPage = () => {
  const { patientId } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDoctors();
    if (patientId) fetchAppointments();
  }, [patientId]);

  const fetchDoctors = async () => {
    const { data } = await supabase.from("doctors").select("id, name, specialization");
    if (data) setDoctors(data);
  };

  const fetchAppointments = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("appointments")
      .select("id, appointment_date, status, doctors(name, specialization)")
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false });
    if (data) setAppointments(data as any);
  };

  const bookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !selectedDoctor || !date) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        patient_id: patientId,
        doctor_id: selectedDoctor,
        appointment_date: new Date(date).toISOString(),
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Appointment booked!" });
      setSelectedDoctor("");
      setDate("");
      fetchAppointments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-warning/10 text-warning",
      confirmed: "bg-success/10 text-success",
      completed: "bg-primary/10 text-primary",
      cancelled: "bg-destructive/10 text-destructive",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 font-heading text-3xl font-bold">Appointments</h1>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Book */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Book Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={bookAppointment} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Doctor</Label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger><SelectValue placeholder="Choose a doctor" /></SelectTrigger>
                    <SelectContent>
                      {doctors.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          Dr. {d.name} — {d.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                  Book Appointment
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* List */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Your Appointments</h2>
            {appointments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Clock className="mb-2 h-8 w-8" />
                  <p>No appointments yet</p>
                </CardContent>
              </Card>
            ) : (
              appointments.map(a => (
                <Card key={a.id} className="transition-all hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold">Dr. {a.doctors?.name}</p>
                      <p className="text-sm text-muted-foreground">{a.doctors?.specialization}</p>
                      <p className="mt-1 text-sm">
                        {new Date(a.appointment_date).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AppointmentsPage;
