import { useQuery } from "@tanstack/react-query";
import { Cohort } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Loader2, 
  Users, 
  Calendar, 
  User as UserIcon,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function UserCohortsList() {
  // Fetch all cohorts the user belongs to
  const { data: cohorts = [], isLoading: isCohortsLoading } = useQuery<Cohort[]>({
    queryKey: ["/api/user/cohorts"],
  });

  if (isCohortsLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        You are not a member of any cohorts yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {cohorts.map((cohort) => (
        <CohortItem key={cohort.id} cohort={cohort} />
      ))}
    </div>
  );
}

interface CohortItemProps {
  cohort: Cohort;
}

// Define moderator type based on API response
interface Moderator {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  membershipRole: string;
  membershipId: number;
}

function CohortItem({ cohort }: CohortItemProps) {
  // Fetch cohort moderators
  const { data: moderators = [], isLoading: isModeratorsLoading } = useQuery<Moderator[]>({
    queryKey: ["/api/cohorts", cohort.id, "moderators"],
    enabled: !!cohort.id,
  });

  // Format date for display
  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      const dateObj = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      return format(dateObj, "MMM d, yyyy");
    } catch (e) {
      return "N/A";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>{cohort.name}</span>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href={`/?cohortId=${cohort.id}`}>
              <Calendar className="h-4 w-4 mr-1" />
              View Feed
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Cohort description */}
          {cohort.description && (
            <p className="text-sm text-muted-foreground">{cohort.description}</p>
          )}
          
          {/* Date information if applicable */}
          {(cohort.startDate || cohort.endDate) && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                {formatDate(cohort.startDate)} 
                {cohort.startDate && cohort.endDate && " to "} 
                {formatDate(cohort.endDate)}
              </span>
            </div>
          )}
          
          {/* Moderators */}
          <div>
            <div className="flex items-center mb-2">
              <ShieldCheck className="h-4 w-4 mr-1 text-primary" />
              <span className="text-sm font-medium">Moderators</span>
            </div>
            
            {isModeratorsLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : moderators.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {moderators.map((mod: Moderator) => (
                  <div key={mod.id} className="flex items-center gap-1 bg-secondary/20 px-2 py-1 rounded-full">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs">
                        <UserIcon className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{mod.fullName || mod.username}</span>
                    {mod.role === 'admin' && (
                      <Badge variant="outline" className="h-4 text-[10px] px-1">Admin</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No moderators found.</p>
            )}
          </div>
          
          {/* Creation date information */}
          <div className="text-xs text-muted-foreground">
            Created: {cohort.createdAt ? formatDate(cohort.createdAt) : "Recently"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}