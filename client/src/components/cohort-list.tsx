import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Cohort, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Schema for creating a new cohort
const createCohortSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long").max(50, "Name must be less than 50 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

export function CohortList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Form for creating a new cohort
  const form = useForm<z.infer<typeof createCohortSchema>>({
    resolver: zodResolver(createCohortSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Query to get user's cohorts
  const { data: cohorts = [], isLoading, error } = useQuery<Cohort[]>({
    queryKey: ["/api/user/cohorts"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Query to get current user info
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Mutation to create a new cohort
  const createCohortMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCohortSchema>) => {
      return apiRequest("POST", "/api/cohorts", data);
    },
    onSuccess: () => {
      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/user/cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
      toast({
        title: "Cohort created",
        description: "Your new cohort has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating cohort",
        description: error.message || "There was a problem creating your cohort. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Function to handle form submission
  const onSubmit = (data: z.infer<typeof createCohortSchema>) => {
    createCohortMutation.mutate(data);
  };

  // Function to navigate to cohort page
  const goToCohort = (cohortId: number) => {
    navigate(`/cohort/${cohortId}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Cohorts</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">Create New Cohort</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Cohort</DialogTitle>
              <DialogDescription>
                Create a new group to connect with others who share similar interests or experiences.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cohort Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Seattle Parents" {...field} />
                      </FormControl>
                      <FormDescription>
                        Choose a name that clearly identifies your group.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this cohort..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createCohortMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {createCohortMutation.isPending ? "Creating..." : "Create Cohort"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {isLoading && <p>Loading your cohorts...</p>}
      {error && <p className="text-red-500">Error loading cohorts: {(error as Error).message}</p>}
      
      {cohorts && cohorts.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">You're not a member of any cohorts yet.</p>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
            Create Your First Cohort
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cohorts && cohorts.map((cohort: Cohort) => (
          <Card key={cohort.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg truncate">{cohort.name}</CardTitle>
                {cohort.creatorId === user?.id && (
                  <Badge className="bg-primary hover:bg-primary/90 ml-2">Creator</Badge>
                )}
              </div>
              {cohort.description && (
                <CardDescription className="line-clamp-2">
                  {cohort.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-muted-foreground">
                Created {cohort.createdAt ? new Date(cohort.createdAt).toLocaleDateString() : "recently"}
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => goToCohort(cohort.id)} 
                className="w-full bg-primary hover:bg-primary/90"
              >
                View Cohort
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}