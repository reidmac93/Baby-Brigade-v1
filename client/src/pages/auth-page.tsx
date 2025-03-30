import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser, forgotPasswordSchema, ForgotPassword } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Redirect, useLocation } from "wouter";

type AuthView = "login" | "register" | "forgotPassword";

export default function AuthPage() {
  const { user, isNewUser, setIsNewUser, loginMutation, registerMutation, forgotPasswordMutation } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  
  // Create a wrapper for setView that also resets the form
  const changeView = (newView: AuthView) => {
    setView(newView);
    loginForm.reset({
      username: "",
      password: "",
      fullName: "",
      email: "",
    });
    if (newView === "forgotPassword") {
      forgotPasswordForm.reset({ email: "" });
    }
  };
  const [, setLocation] = useLocation();

  // Create a separate login schema that only requires username and password
  const loginSchema = insertUserSchema.pick({
    username: true,
    password: true,
  });

  // For registration use the full schema
  const registerSchema = insertUserSchema;

  // Use the appropriate schema based on the current view
  const loginForm = useForm<InsertUser>({
    resolver: zodResolver(view === "login" ? loginSchema : registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
    },
    // Reset validation errors when switching between views
    mode: "onSubmit",
  });

  const forgotPasswordForm = useForm<ForgotPassword>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  if (user) {
    // After registration/login, redirect to profile page
    return <Redirect to="/profile" />;
  }

  const onSubmit = (data: InsertUser) => {
    console.log("Form submitted", view, data);
    if (view === "login") {
      console.log("Attempting login with:", { username: data.username });
      loginMutation.mutate({
        username: data.username,
        password: data.password,
      });
    } else {
      console.log("Attempting registration");
      registerMutation.mutate(data);
    }
  };

  const onForgotPasswordSubmit = (data: ForgotPassword) => {
    console.log("Forgot password submitted", data);
    forgotPasswordMutation.mutate(data, {
      onSuccess: () => {
        // If we have the token in our response (for demo purposes), show success message
        console.log("Forgot password success, changing view to login");
        changeView("login");
      },
    });
  };

  const isPending = 
    loginMutation.isPending || 
    registerMutation.isPending || 
    forgotPasswordMutation.isPending;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {view === "login" 
                ? "Welcome Back" 
                : view === "register" 
                  ? "Join Our Community" 
                  : "Reset Your Password"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {view === "login" && (
              <Form {...loginForm}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault(); 
                    console.log("Login form submitted via event handler");
                    loginForm.handleSubmit(onSubmit)(e);
                  }} 
                  className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input {...loginForm.register("username")} />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-500">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input type="password" {...loginForm.register("password")} />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  {loginMutation.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                      {loginMutation.error.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                    onClick={(e) => {
                      if (!isPending) {
                        e.preventDefault();
                        console.log("Login button clicked");
                        // Get form values directly
                        const username = loginForm.getValues("username");
                        const password = loginForm.getValues("password");
                        console.log("Manual login with values:", { username });
                        loginMutation.mutate({ username, password });
                      }
                    }}
                  >
                    {isPending ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Please wait
                      </span>
                    ) : (
                      "Login"
                    )}
                  </Button>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm"
                      onClick={() => changeView("register")}
                    >
                      Need an account? Register
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm"
                      onClick={() => changeView("forgotPassword")}
                    >
                      Forgot password?
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {view === "register" && (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input {...loginForm.register("username")} />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-500">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input type="password" {...loginForm.register("password")} />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input {...loginForm.register("fullName")} />
                    {loginForm.formState.errors.fullName && (
                      <p className="text-sm text-red-500">{loginForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input type="email" {...loginForm.register("email")} />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {registerMutation.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                      {registerMutation.error.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Please wait
                      </span>
                    ) : (
                      "Register"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    className="w-full mt-4"
                    onClick={() => changeView("login")}
                  >
                    Already have an account? Login
                  </Button>
                </form>
              </Form>
            )}

            {view === "forgotPassword" && (
              <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input type="email" {...forgotPasswordForm.register("email")} />
                    {forgotPasswordForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{forgotPasswordForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {forgotPasswordMutation.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                      {forgotPasswordMutation.error.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Please wait
                      </span>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    className="w-full mt-4"
                    onClick={() => changeView("login")}
                  >
                    Back to login
                  </Button>
                </form>
              </Form>
            )}
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