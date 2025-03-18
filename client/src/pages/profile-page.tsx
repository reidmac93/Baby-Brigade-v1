import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Baby, insertBabySchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Baby as BabyIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

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
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BabyIcon className="h-6 w-6" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Parent Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <p className="text 1g">{user?.fullName}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-lg">{user?.email}</p>
                </div>
              </div>
            </div>

            {baby ? (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Baby Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="text-lg">{baby.name}</p>
                  </div>
                  <div>
                    <Label>Birth Date</Label>
                    <p className="text-lg">
                      {new Date(baby.birthDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => babyMutation.mutate(data))}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Baby's Name</Label>
                    <Input {...form.register("name")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Birth Date</Label>
                    <Input type="date" {...form.register("birthDate")} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={babyMutation.isPending}
                  >
                    {babyMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Baby Information
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
