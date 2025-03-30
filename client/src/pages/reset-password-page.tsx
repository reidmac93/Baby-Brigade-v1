import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPassword } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { z } from "zod";

export default function ResetPasswordPage() {
  const { user, resetPasswordMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string>("");
  
  // Get the token from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);
  
  // Extend the reset password schema to validate password confirmation
  const resetPasswordWithConfirmSchema = resetPasswordSchema.extend({
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  type FormValues = z.infer<typeof resetPasswordWithConfirmSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(resetPasswordWithConfirmSchema),
    defaultValues: {
      token: token,
      password: "",
      confirmPassword: "",
    },
  });
  
  // Update form value when token is loaded from URL
  useEffect(() => {
    if (token) {
      form.setValue("token", token);
    }
  }, [token, form]);

  if (user) {
    // Already logged in, redirect to profile
    return <Redirect to="/profile" />;
  }

  const onSubmit = (data: FormValues) => {
    resetPasswordMutation.mutate(
      {
        token: data.token,
        password: data.password,
      },
      {
        onSuccess: () => {
          // On successful password reset, redirect to login page
          setTimeout(() => {
            setLocation("/auth");
          }, 2000);
        },
      }
    );
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Invalid Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              The password reset link is invalid or expired. Please request a new link.
            </p>
            <Button
              onClick={() => setLocation("/auth")}
              className="w-full"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  type="password"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  type="password"
                  {...form.register("confirmPassword")}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </span>
                ) : (
                  "Reset Password"
                )}
              </Button>
              
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setLocation("/auth")}
              >
                Back to Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}