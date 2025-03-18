import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <a className={`text-lg font-semibold ${location === "/" ? "text-primary" : "text-foreground"}`}>
                Home
              </a>
            </Link>
            <Link href="/profile">
              <a className={`text-lg font-semibold ${location === "/profile" ? "text-primary" : "text-foreground"}`}>
                Profile
              </a>
            </Link>
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
