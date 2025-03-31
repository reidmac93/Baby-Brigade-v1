import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Users, Shield } from "lucide-react";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const isAdmin = user.role === "admin";

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className={`text-lg ${location === "/" ? "font-bold text-black" : "text-foreground"}`}>
              Home
            </Link>
            <Link href="/profile" className={`text-lg ${location === "/profile" ? "font-bold text-black" : "text-foreground"}`}>
              Profile
            </Link>
            {isAdmin && (
              <Link 
                href="/admin/cohorts" 
                className={`text-lg flex items-center gap-1 ${location === "/admin/cohorts" ? "font-bold text-black" : "text-foreground"}`}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>
          <Button 
            variant="ghost" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
