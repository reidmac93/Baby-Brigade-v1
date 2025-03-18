import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Baby, insertBabySchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Baby as BabyIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: baby, isLoading } = useQuery<Baby>({
    queryKey: ["/api/baby"],
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
      toast({
        title: "Success",
        description: "Baby information saved successfully!",
      });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Parent Information Card */}
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
      </div>
    </div>
  );
}