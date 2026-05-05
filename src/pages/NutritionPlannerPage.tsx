import { useState, useEffect } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGroqAI } from "@/hooks/useGroqAI";
import { Loader2, Apple, Utensils, Flame, Activity, Sparkles, Coffee, Moon, Sun } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Meal {
  name: string;
  calories: number;
  description: string;
  ingredients: string[];
}

interface DailyPlan {
  day: string;
  totalCalories: number;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
}

export const NutritionPlannerPage = () => {
  const { user, patientId } = useAuth();
  const { toast } = useToast();
  const { generateCompletion, loading: isGenerating } = useGroqAI();
  
  const [profile, setProfile] = useState<{
    weight_kg?: number;
    height_cm?: number;
    medical_conditions?: string;
  } | null>(null);
  
  const [goal, setGoal] = useState("");
  const [mealPlan, setMealPlan] = useState<DailyPlan[] | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("weight_kg, height_cm, medical_conditions")
          .eq("id", user.id)
          .single();
        
        if (error) throw error;
        setProfile(data);
      } catch (err: any) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [user]);

  const generatePlan = async () => {
    if (!goal.trim()) {
      toast({ title: "Please enter a specific goal", variant: "destructive" });
      return;
    }

    setMealPlan(null);

    const conditions = profile?.medical_conditions ? `The patient has the following medical conditions/allergies: ${profile.medical_conditions}.` : "The patient has no specific medical conditions listed.";
    const bodyInfo = `Weight: ${profile?.weight_kg || 'Unknown'} kg, Height: ${profile?.height_cm || 'Unknown'} cm.`;

    const systemPrompt = `You are an expert AI Dietitian. Create a personalized, healthy 7-day meal plan based on the user's health profile and goals.
    
    ${bodyInfo}
    ${conditions}
    
    IMPORTANT: You must respond with ONLY a valid JSON array, no markdown, no code blocks. The JSON array must contain exactly 7 objects, one for each day.
    
    Format EXACTLY like this:
    [
      {
        "day": "Monday",
        "totalCalories": 2000,
        "breakfast": {
          "name": "Meal Name",
          "calories": 500,
          "description": "Brief description",
          "ingredients": ["ing1", "ing2"]
        },
        "lunch": {
          "name": "Meal Name",
          "calories": 700,
          "description": "Brief description",
          "ingredients": ["ing1", "ing2"]
        },
        "dinner": {
          "name": "Meal Name",
          "calories": 800,
          "description": "Brief description",
          "ingredients": ["ing1", "ing2"]
        }
      }
    ]`;

    try {
      const content = await generateCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a 7-day meal plan to achieve this goal: ${goal}` }
      ]);

      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as DailyPlan[];
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Invalid format received from AI.");
      }
      
      setMealPlan(parsed);
      
      // Save the generated meal plan to Supabase
      if (patientId) {
        const { error: insertError } = await supabase
          .from("meal_plans")
          .insert({
            patient_id: patientId,
            goal: goal,
            plan_data: parsed
          });
          
        if (insertError) {
          console.error("Error saving meal plan to database:", insertError);
          toast({ title: "Plan generated but couldn't be saved", description: "Your plan is ready but couldn't be saved to your profile.", variant: "destructive" });
          return;
        }
      }

      toast({ title: "Meal plan generated successfully!", description: "Your personalized weekly plan is ready." });
    } catch (err: any) {
      console.error("Generation Error:", err);
      toast({ title: "Failed to generate plan", description: err.message || "Please try again later.", variant: "destructive" });
    }
  };

  const getMealIcon = (type: string) => {
    switch(type) {
      case 'breakfast': return <Sun className="h-5 w-5 text-amber-500" />;
      case 'lunch': return <Coffee className="h-5 w-5 text-orange-500" />;
      case 'dinner': return <Moon className="h-5 w-5 text-indigo-500" />;
      default: return <Utensils className="h-5 w-5" />;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-heading text-4xl font-bold text-foreground">
              <Apple className="h-10 w-10 text-green-500" />
              AI Nutrition Planner
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Personalized weekly meal plans tailored to your health profile and goals.
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-12">
          {/* Controls Sidebar */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <Card className="glass overflow-hidden border-border/50 shadow-xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  Your Profile
                </CardTitle>
                <CardDescription>We use your health data to personalize recommendations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingProfile ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-card/50 p-3 shadow-inner">
                        <Label className="text-xs text-muted-foreground">Weight</Label>
                        <p className="font-semibold">{profile?.weight_kg || "--"} kg</p>
                      </div>
                      <div className="rounded-xl bg-card/50 p-3 shadow-inner">
                        <Label className="text-xs text-muted-foreground">Height</Label>
                        <p className="font-semibold">{profile?.height_cm || "--"} cm</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-card/50 p-3 shadow-inner">
                      <Label className="text-xs text-muted-foreground">Medical Conditions / Allergies</Label>
                      <p className="text-sm font-medium mt-1">
                        {profile?.medical_conditions || "None reported"}
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2 pt-4 border-t border-border/50">
                  <Label>Primary Goal</Label>
                  <Input 
                    placeholder="e.g., Lose weight, Build muscle, Low sodium" 
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="bg-background/50 border-border/50"
                  />
                </div>

                <Button 
                  className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02]"
                  onClick={generatePlan}
                  disabled={isGenerating || loadingProfile}
                >
                  {isGenerating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Crafting Plan...</>
                  ) : (
                    <><Utensils className="mr-2 h-4 w-4" /> Generate Weekly Plan</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Meal Plan Display */}
          <div className="md:col-span-8 lg:col-span-9">
            {!mealPlan && !isGenerating ? (
              <Card className="flex flex-col items-center justify-center min-h-[400px] border-dashed glass text-center">
                <div className="rounded-full bg-green-500/10 p-6 mb-4">
                  <Activity className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Ready to plan your week?</h3>
                <p className="text-muted-foreground max-w-md">
                  Enter your health goal on the left and our AI dietitian will create a customized 7-day meal plan perfectly suited for your body and conditions.
                </p>
              </Card>
            ) : isGenerating ? (
              <Card className="flex flex-col items-center justify-center min-h-[400px] glass">
                <Loader2 className="h-12 w-12 animate-spin text-green-500 mb-4" />
                <h3 className="text-xl font-semibold animate-pulse">Analyzing nutritional profile...</h3>
                <p className="text-muted-foreground mt-2">Designing the perfect recipes for you</p>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)] pr-4">
                <div className="space-y-8">
                  {mealPlan?.map((day, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                          {idx + 1}
                        </div>
                        <h2 className="text-2xl font-bold">{day.day}</h2>
                        <Badge variant="secondary" className="ml-auto bg-card border-border flex items-center gap-1 text-sm py-1">
                          <Flame className="h-3 w-3 text-orange-500" /> {day.totalCalories} kcal
                        </Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        {['breakfast', 'lunch', 'dinner'].map((mealType) => {
                          const meal = day[mealType as keyof DailyPlan] as unknown as Meal;
                          if (!meal) return null;
                          return (
                            <Card key={mealType} className="glass hover:shadow-xl hover:border-green-500/50 transition-all duration-300 overflow-hidden group">
                              <div className="h-2 w-full bg-gradient-to-r from-transparent via-green-500/20 to-transparent group-hover:via-green-500/50 transition-colors" />
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <Badge variant="outline" className="capitalize flex items-center gap-1.5 mb-2 shadow-sm">
                                    {getMealIcon(mealType)} {mealType}
                                  </Badge>
                                  <span className="text-xs font-semibold text-muted-foreground flex items-center">
                                    <Flame className="h-3 w-3 mr-1 text-orange-400" />
                                    {meal.calories}
                                  </span>
                                </div>
                                <CardTitle className="text-lg line-clamp-2 leading-tight">{meal.name}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                  {meal.description}
                                </p>
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Key Ingredients</p>
                                  <div className="flex flex-wrap gap-1">
                                    {meal.ingredients.slice(0, 4).map((ing, i) => (
                                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border/50 text-foreground">
                                        {ing}
                                      </span>
                                    ))}
                                    {meal.ingredients.length > 4 && (
                                      <span className="text-xs px-2 py-0.5 text-muted-foreground">+{meal.ingredients.length - 4} more</span>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NutritionPlannerPage;
