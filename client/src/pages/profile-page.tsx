import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Baby, insertBabySchema, Cohort } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import React, { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Baby as BabyIcon, Users, Calendar, ShieldCheck, Upload, Pencil, Save, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { CohortManagement } from "@/components/cohort-management";
import { CohortList } from "@/components/cohort-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Edit form for baby information
function BabyEditForm({ baby, onCancel }: { baby: Baby; onCancel: () => void }) {
  const { toast } = useToast();
  const [photoUrl, setPhotoUrl] = useState<string>(baby.photoUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  
  // Create a schema for the edit form based on the insertBabySchema
  const updateBabySchema = z.object({
    name: z.string().min(1, "Name is required"),
    birthDate: z.string().min(1, "Birth date is required"),
  });
  
  type BabyFormValues = z.infer<typeof updateBabySchema>;
  
  const form = useForm<BabyFormValues>({
    resolver: zodResolver(updateBabySchema),
    defaultValues: {
      name: baby.name,
      birthDate: new Date(baby.birthDate).toISOString().split('T')[0],
    },
  });
  
  // Mutation for updating baby information
  const updateBabyMutation = useMutation({
    mutationFn: async (data: BabyFormValues & { photoUrl?: string }) => {
      const res = await apiRequest("PUT", `/api/baby/${baby.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/baby"] });
      toast({
        title: "Success",
        description: "Baby information updated successfully!",
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Only accept image files
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    // Convert the image to a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhotoUrl(result);
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };
  
  const onSubmit = (data: BabyFormValues) => {
    updateBabyMutation.mutate({
      ...data,
      photoUrl,
    });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <Avatar className="h-32 w-32 mb-4">
            {photoUrl ? (
              <AvatarImage src={photoUrl} alt={baby.name} />
            ) : (
              <AvatarFallback className="text-3xl">
                {baby.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="w-full max-w-xs">
            <Label htmlFor="photo" className="block mb-2">Photo</Label>
            <div className="flex gap-2">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading || updateBabyMutation.isPending}
                className="text-sm"
              />
            </div>
            {isUploading && (
              <div className="mt-2 text-center text-sm text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                Processing image...
              </div>
            )}
          </div>
        </div>
      
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Baby's Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-2 pt-2">
          <Button 
            type="submit" 
            disabled={updateBabyMutation.isPending}
            className="flex-1"
          >
            {updateBabyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
            disabled={updateBabyMutation.isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function ProfilePage() {
  const { user, isNewUser, setIsNewUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);

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
                          {cohort.startDate ? format(new Date(cohort.startDate as string), "MMM d, yyyy") : "N/A"} - 
                          {cohort.endDate ? format(new Date(cohort.endDate as string), "MMM d, yyyy") : "N/A"}
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
                {baby && (
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {baby ? (
                  isEditing ? (
                    <BabyEditForm baby={baby} onCancel={() => setIsEditing(false)} />
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-center mb-4">
                        <Avatar className="h-32 w-32">
                          {baby.photoUrl ? (
                            <AvatarImage src={baby.photoUrl} alt={baby.name} />
                          ) : (
                            <AvatarFallback className="text-3xl">
                              {baby.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
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
                    </div>
                  )
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