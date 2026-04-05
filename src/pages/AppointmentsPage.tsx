import { useEffect, useState } from "react";
import { sendNotification, RECIPIENT_PHONE } from "@/lib/webhook";

import { MainLayout } from "@/layouts/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Loader2, Star, Award, CheckCircle2 } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience_years?: number;
  rating?: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  doctors: { full_name: string; specialty: string } | null;
}

const AppointmentsPage = () => {
  const { patientId, user } = useAuth();
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
    const { data } = await supabase.from("doctors").select("id, full_name, specialty, experience_years, rating");
    if (data) {
      setDoctors(data.map(d => ({
        id: d.id,
        name: d.full_name,
        specialization: d.specialty,
        experience_years: d.experience_years,
        rating: d.rating
      })));
    }
  };

  const fetchAppointments = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("appointments")
      .select("id, appointment_date, status, doctors(full_name, specialty)")
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

      // Send WhatsApp Notification
      const selectedDoc = doctors.find(d => d.id === selectedDoctor);
      const formattedDate = new Date(date).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
      sendNotification(RECIPIENT_PHONE, `Your appointment is confirmed with Dr. ${selectedDoc?.name || "Specialist"} on ${formattedDate}.`, user?.email || "user@gmail.com");

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
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground mt-2 text-lg">Book appointments with trusted specialists in seconds</p>
        </div>

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
                <div className="space-y-3">
                  <Label>Select Doctor</Label>
                  <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
                    {doctors.map(d => (
                      <div 
                        key={d.id} 
                        onClick={() => setSelectedDoctor(d.id)}
                        className={`relative cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
                          selectedDoctor === d.id 
                            ? "border-primary bg-primary/5 ring-1 ring-primary" 
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {selectedDoctor === d.id && (
                          <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                        )}
                        <h4 className="font-heading font-semibold text-lg">Dr. {d.name}</h4>
                        <p className="text-sm text-primary font-medium mb-3">{d.specialization}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {d.experience_years && (
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4" />
                              <span>{d.experience_years}+ years exp.</span>
                            </div>
                          )}
                          {d.rating && (
                            <div className="flex items-center gap-1 text-amber-500 font-medium">
                              <Star className="h-4 w-4 fill-amber-500" />
                              <span>{d.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                      <p className="font-semibold">Dr. {a.doctors?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{a.doctors?.specialty}</p>
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
