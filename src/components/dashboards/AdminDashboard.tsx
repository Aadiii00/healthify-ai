import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Stethoscope, Shield, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AdminDashboard = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const { toast } = useToast();

  // New doctor form
  const [docName, setDocName] = useState("");
  const [docSpec, setDocSpec] = useState("");
  const [docEmail, setDocEmail] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [p, d] = await Promise.all([
      supabase.from("patients").select("*").order("created_at", { ascending: false }),
      supabase.from("doctors").select("*").order("created_at", { ascending: false }),
    ]);
    if (p.data) setPatients(p.data);
    if (d.data) setDoctors(d.data);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{patients.length}</p>
              <p className="text-sm text-muted-foreground">Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Stethoscope className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{doctors.length}</p>
              <p className="text-sm text-muted-foreground">Doctors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Shield className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{patients.length + doctors.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients list */}
      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">No patients registered</p>
          ) : (
            <div className="space-y-2">
              {patients.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.email}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.gender} • Age {p.age || "N/A"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctors list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">No doctors registered</p>
          ) : (
            <div className="space-y-2">
              {doctors.map(d => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">Dr. {d.name}</p>
                    <p className="text-sm text-muted-foreground">{d.email}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {d.specialization}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
