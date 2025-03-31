import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Plus, Shield, Users, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Cohort, insertCohortSchema } from "@shared/schema";
import { z } from "zod";

export default function AdminCohortsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortDescription, setNewCohortDescription] = useState("");
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  // Helper function to handle redirection
  const redirectIfNotAdmin = () => {
    if (user && user.role !== "admin") {
      setLocation("/profile");
      return true;
    }
    return false;
  };

  // If user is not an admin, redirect to profile
  if (redirectIfNotAdmin()) {
    return <div>Redirecting...</div>;
  }

  // Load all cohorts for the admin
  const { data: cohorts = [], isLoading, error } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
    enabled: !!user && user.role === "admin",
  });

  // Create a new cohort
  const createCohortMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const validated = insertCohortSchema.parse(data);
      const res = await apiRequest("POST", "/api/cohorts", validated);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cohort created successfully!",
      });
      setNewCohortName("");
      setNewCohortDescription("");
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCohortName.trim() === "") return;
    
    createCohortMutation.mutate({
      name: newCohortName,
      description: newCohortDescription,
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Cohort Management</h1>
          <p className="text-muted-foreground">Manage all cohorts in the system</p>
        </div>
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading cohorts. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Cohort Management</h1>
          <p className="text-muted-foreground">Manage all cohorts in the system</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create New Cohort
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Cohort</DialogTitle>
              <DialogDescription>
                Create a new group for users with similar interests or experiences.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCohort}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Cohort Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter cohort name"
                    value={newCohortName}
                    onChange={(e) => setNewCohortName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this cohort is about"
                    value={newCohortDescription}
                    onChange={(e) => setNewCohortDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createCohortMutation.isPending}>
                  {createCohortMutation.isPending ? "Creating..." : "Create Cohort"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Cohorts ({cohorts.length})</CardTitle>
          <CardDescription>
            View and manage all cohorts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cohorts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No cohorts found. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cohorts.map((cohort) => (
                <div key={cohort.id} className="flex items-center justify-between border rounded-md p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{cohort.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        ID: {cohort.id}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {cohort.description || "No description"}
                    </p>
                    {cohort.creatorId && (
                      <p className="text-xs text-muted-foreground">
                        Created by User ID: {cohort.creatorId}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/cohorts/${cohort.id}`}>
                        <Users className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/cohorts/${cohort.id}?tab=manage`}>
                        <Shield className="h-4 w-4 mr-1" />
                        Manage
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}