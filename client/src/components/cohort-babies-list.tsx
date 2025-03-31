import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Baby as BabyIcon, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

// Define the interface for what we expect from the API
interface BabyData {
  id: number;
  userId: number;
  name: string;
  birthDate: string;
  birthWeek?: string;
  cohortId?: number;
  photoUrl?: string;
}

interface UserData {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  membershipRole: string;
}

interface BabyWithParent {
  user: UserData;
  baby: BabyData;
}

interface CohortBabiesListProps {
  cohortId: number;
}

export function CohortBabiesList({ cohortId }: CohortBabiesListProps) {
  const { 
    data, 
    isLoading 
  } = useQuery<BabyWithParent[]>({
    queryKey: ["/api/cohorts", cohortId, "babies"],
    enabled: !!cohortId,
  });
  
  // Format dates safely
  const formatDateDisplay = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMMM d, yyyy");
    } catch (e) {
      return "N/A";
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  // Safely check if we have data
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No babies in this cohort yet.
      </p>
    );
  }
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Babies in this Cohort</h4>
      <div className="space-y-3">
        {data.map((item) => (
          <div 
            key={item.baby.id} 
            className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <Avatar className="h-10 w-10">
              {item.baby.photoUrl ? (
                <AvatarImage src={item.baby.photoUrl} alt={item.baby.name} />
              ) : null}
              <AvatarFallback>
                <BabyIcon className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col">
                <p className="text-sm font-medium truncate">{item.baby.name}</p>
                <p className="text-xs text-muted-foreground">
                  Born: {formatDateDisplay(item.baby.birthDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{item.user.fullName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}