import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type UserRole = "patient" | "doctor" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  patientId: string | null;
  doctorId: string | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDetails = async (userId: string) => {
    let [rolesRes, patientRes, doctorRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("patients").select("id").eq("user_id", userId).maybeSingle(),
      supabase.from("doctors").select("id").eq("user_id", userId).maybeSingle(),
    ]);

    // Auto-create missing roles and patient records for smooth UX
    if (!rolesRes.data && !rolesRes.error) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "patient" });
      rolesRes = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    }

    if (!patientRes.data && (!rolesRes.data || rolesRes.data.role === "patient")) {
      await supabase.from("patients").insert({ 
        user_id: userId, 
        full_name: user?.user_metadata?.name || "Anonymous Patient" 
      });
      patientRes = await supabase.from("patients").select("id").eq("user_id", userId).maybeSingle();
    }

    if (rolesRes.data) setRole(rolesRes.data.role as UserRole);
    if (patientRes.data) setPatientId(patientRes.data.id);
    if (doctorRes.data) setDoctorId(doctorRes.data.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserDetails(session.user.id), 0);
      } else {
        setRole(null);
        setPatientId(null);
        setDoctorId(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserDetails(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, patientId, doctorId, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
