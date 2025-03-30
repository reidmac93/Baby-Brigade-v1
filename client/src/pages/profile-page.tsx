import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Baby, insertBabySchema, Cohort } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Baby as BabyIcon, Users, Calendar, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { CohortManagement } from "@/components/cohort-management";

export default function ProfilePage() {
  const { user, isNewUser, setIsNewUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch baby information
  const { data: baby, isLoading: isBabyLoading } = useQuery<Baby>({
    queryKey: ["/api/baby"],
  });
  
  // Fetch cohort information
  const { data: cohort, isLoading: isCohortLoading } = useQuery<Cohort>({
    queryKey: ["/api/cohort"],
    // Only fetch cohort if baby exists
    enabled: !!baby,
  });

  const form = useForm({
    resolver: zodResolver(insertBabySchema),
    defaultValues: {
      name: "",
      birthDate: "",
    },
  });

  const babyMutation = useMutation({
    mutationFn: async (data: { name: string; birthDate: string }) => {
      const res = await apiRequest("POST", "/api/baby", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/baby"] });
      
      // Reset the new user flag if this was a new user
      if (isNewUser) {
        setIsNewUser(false);
        toast({
          title: "Welcome to your cohort!",
          description: "Your baby has been added and you've been connected to a cohort with similar aged babies.",
        });
      } else {
        toast({
          title: "Success",
          description: "Baby information saved successfully!",
        });
      }
      
      // Redirect to home page after successfully adding baby information
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = isBabyLoading || (baby && isCohortLoading);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If this is a new user who just registered and doesn't have baby info yet
  // we want to prioritize the baby information form to guide them through onboarding
  const isNewUserWithoutBaby = isNewUser && !baby;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* For new users who need to add baby info, show a welcome card */}
        {isNewUserWithoutBaby && (
          <Card className="border-primary">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-2xl text-center">Welcome to BabyConnect!</CardTitle>
              <CardDescription className="text-center text-base">
                To get started, please add your baby's information below to join a cohort of parents
                with babies born around the same time.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Baby Information Card - Show first for new users */}
        {isNewUserWithoutBaby ? (
          <Card className="shadow-lg border-2 border-primary">
            <CardHeader className="bg-primary/10">
              <CardTitle className="text-2xl flex items-center gap-2">
                <BabyIcon className="h-6 w-6" />
                Add Your Baby's Information
              </CardTitle>
              <CardDescription>
                This will help us connect you with other parents with babies of similar age
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => babyMutation.mutate(data))}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Baby's Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter baby's name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birth Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your baby will be placed in a cohort with other babies born in the same week
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={babyMutation.isPending}
                  >
                    {babyMutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting to your cohort...
                      </span>
                    ) : (
                      "Join My Cohort"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Parent Information Card for existing users */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Parent Information</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Full Name</Label>
                  <p className="text-lg font-medium mt-1">{user?.fullName}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-lg font-medium mt-1">{user?.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Cohort Information Card - Only show if baby and cohort exist */}
            {baby && cohort && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Users className="h-6 w-6" />
                      Your Cohort
                    </CardTitle>
                    <CardDescription>
                      Connect with other parents whose babies were born around the same time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <Label>Cohort Name</Label>
                      <p className="text-lg font-medium">{cohort.name}</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label>Week Range</Label>
                        <p className="mt-1">
                          {format(new Date(cohort.startDate), "MMM d, yyyy")} - {format(new Date(cohort.endDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex flex-col">
                        <Label>Cohort Feed</Label>
                        <Button asChild variant="outline" className="mt-2 w-fit">
                          <Link href="/">
                            <Calendar className="h-4 w-4 mr-2" />
                            Go to Feed
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Cohort Management - only shown if user is a moderator or admin */}
                <CohortManagement cohortId={cohort.id} />
              </>
            )}

            {/* Baby Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BabyIcon className="h-6 w-6" />
                  Baby Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {baby ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Name</Label>
                      <p className="text-lg font-medium mt-1">{baby.name}</p>
                    </div>
                    <div>
                      <Label>Birth Date</Label>
                      <p className="text-lg font-medium mt-1">
                        {new Date(baby.birthDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((data) => babyMutation.mutate(data))}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Baby's Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter baby's name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Birth Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your baby will be placed in a cohort with other babies born in the same week
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={babyMutation.isPending}
                      >
                        {babyMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Baby Information
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}