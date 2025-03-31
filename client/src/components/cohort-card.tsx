import { Baby, Cohort } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarDays, MessageSquare, Users } from "lucide-react";

interface CohortCardProps {
  cohort: Cohort;
  baby: Baby | null;
}

export function CohortCard({ cohort, baby }: CohortCardProps) {
  // Format dates safely with optional dates
  const formatDateDisplay = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMMM yyyy");
    } catch (e) {
      return "N/A";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Cohort Info
        </CardTitle>
        {cohort.description && (
          <CardDescription>{cohort.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">{cohort.name}</h3>
          
          {/* Only show date ranges if they exist */}
          {(cohort.startDate || cohort.endDate) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {formatDateDisplay(cohort.startDate)} 
              {cohort.startDate && cohort.endDate && " to "}
              {formatDateDisplay(cohort.endDate)}
            </p>
          )}
          
          {/* Display creation date */}
          <p className="text-sm text-muted-foreground">
            Created: {cohort.createdAt ? new Date(cohort.createdAt).toLocaleDateString() : "Recently"}
          </p>
        </div>

        {/* Only show baby info if baby is provided */}
        {baby && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Your Baby</h4>
            <p className="text-sm">
              {baby.name} - Born {format(new Date(baby.birthDate), "MMMM d, yyyy")}
            </p>
          </div>
        )}

        {/* Information about the cohort purpose */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
          <h4 className="text-sm font-medium flex items-center gap-1 mb-1">
            <MessageSquare className="h-4 w-4" />
            About This Cohort
          </h4>
          <p className="text-sm text-muted-foreground">
            {cohort.description || 
              "Share experiences, ask questions, and connect with others in this cohort."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
