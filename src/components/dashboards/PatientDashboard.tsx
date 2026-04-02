import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Calendar, FileText, Clock } from "lucide-react";

export const PatientDashboard = () => {
  const { patientId } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, records: 0, pending: 0 });

  useEffect(() => {
    if (!patientId) return;
    Promise.all([
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
      supabase.from("medical_records").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", patientId).eq("status", "pending"),
    ]).then(([a, r, p]) => {
      setStats({ appointments: a.count || 0, records: r.count || 0, pending: p.count || 0 });
    });
  }, [patientId]);

  const cards = [
    { label: "Total Appointments", value: stats.appointments, icon: Calendar, color: "text-primary" },
    { label: "Medical Records", value: stats.records, icon: FileText, color: "text-accent" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <c.icon className={`h-6 w-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/symptom-checker">
          <Card className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-medical">
                <Brain className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold">AI Symptom Checker</h3>
                <p className="text-sm text-muted-foreground">Get instant health insights</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/appointments">
          <Card className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
                <Calendar className="h-7 w-7 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold">Book Appointment</h3>
                <p className="text-sm text-muted-foreground">Schedule a doctor visit</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};
