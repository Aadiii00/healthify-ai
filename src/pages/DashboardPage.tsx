import { useAuth } from "@/context/AuthContext";
import { MainLayout } from "@/layouts/MainLayout";
import { PatientDashboard } from "@/components/dashboards/PatientDashboard";
import { DoctorDashboard } from "@/components/dashboards/DoctorDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";

const DashboardPage = () => {
  const { role, user } = useAuth();

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold">Health Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-lg">Your real-time health insights powered by AI</p>
        </div>

        {role === "doctor" ? <DoctorDashboard /> :
         role === "admin" ? <AdminDashboard /> :
         <PatientDashboard />}
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
