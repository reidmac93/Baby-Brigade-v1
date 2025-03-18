import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Redirect, useLocation } from "wouter";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
    },
  });

  if (user) {
    // After registration/login, redirect to profile page
    return <Redirect to="/profile" />;
  }

  const onSubmit = (data: InsertUser) => {
    if (isLogin) {
      loginMutation.mutate({
        username: data.username,
        password: data.password,
      });
    } else {
      registerMutation.mutate(data);
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {isLogin ? "Welcome Back" : "Join Our Community"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input {...form.register("username")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input type="password" {...form.register("password")} />
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input {...form.register("fullName")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input type="email" {...form.register("email")} />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? "Login" : "Register"}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Need an account? Register" : "Have an account? Login"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-col items-center justify-center p-8 bg-primary/5">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            Welcome to BabyConnect
          </h1>
          <p className="text-lg text-muted-foreground">
            Join other parents with babies born around the same time as yours.
            Share experiences, get advice, and make lasting connections.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <img
              src="https://images.unsplash.com/photo-1646045878558-f39c1c573088"
              alt="Parent and baby"
              className="rounded-lg shadow-lg"
            />
            <img
              src="https://images.unsplash.com/photo-1656419749971-9dd5e857f288"
              alt="Baby milestone"
              className="rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}