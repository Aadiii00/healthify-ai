import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, Brain, Calendar, FileText, Shield, Stethoscope } from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { SymptomFormSection } from "@/components/SymptomFormSection";

const features = [
  { icon: Brain, title: "AI Symptom Analysis", desc: "Get instant AI-powered health insights based on your symptoms" },
  { icon: Stethoscope, title: "Find Doctors", desc: "Connect with specialized healthcare professionals" },
  { icon: Calendar, title: "Book Appointments", desc: "Schedule visits with just a few clicks" },
  { icon: FileText, title: "Medical Records", desc: "Access your complete medical history anytime" },
  { icon: Shield, title: "Secure & Private", desc: "Your health data is encrypted and protected" },
  { icon: Activity, title: "Health Tracking", desc: "Monitor your health journey over time" },
];

const LandingPage = () => {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Brain className="h-4 w-4" />
              Smarter Health Decisions, Instantly
            </div>
            <h1 className="mb-6 font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Take Control of Your Health with{" "}
              <span className="text-gradient-medical">AI</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Analyze symptoms, track your health, and connect with doctors — all powered by intelligent insights.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="min-w-[200px] text-base shadow-medical">
                  Start Free Analysis
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="min-w-[200px] text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-heading text-3xl font-bold">Everything You Need</h2>
            <p className="text-muted-foreground">Comprehensive health management powered by artificial intelligence</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-gradient-medical group-hover:text-primary-foreground">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-heading text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Symptom Analysis Form */}
      <SymptomFormSection />

      {/* CTA */}
      <section className="border-t border-border bg-gradient-hero py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 font-heading text-2xl font-bold">Ready to Take Control of Your Health?</h2>
          <p className="mb-6 text-muted-foreground">Join thousands who trust Healthify AI for their health insights</p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="shadow-medical">Get Started — It's Free</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-heading font-semibold">Healthify AI</span>
          </div>
          <p>© 2026 Healthify AI. All rights reserved. <br className="sm:hidden"/> AI-powered healthcare for everyone.</p>
        </div>
      </footer>
    </MainLayout>
  );
};

export default LandingPage;
