import { Baby, Cohort } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface CohortCardProps {
  cohort: Cohort;
  baby: Baby;
}

export function CohortCard({ cohort, baby }: CohortCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Cohort</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">{cohort.name}</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(cohort.startDate), "MMMM yyyy")} to{" "}
            {format(new Date(cohort.endDate), "MMMM yyyy")}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Your Baby</h4>
          <p className="text-sm">
            {baby.name} - Born {format(new Date(baby.birthDate), "MMMM d, yyyy")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <img
            src="https://images.unsplash.com/photo-1656419749971-9dd5e857f288"
            alt="Baby milestone"
            className="rounded-lg"
          />
          <img
            src="https://images.unsplash.com/photo-1656420578069-d612ecc38212"
            alt="Baby growth"
            className="rounded-lg"
          />
        </div>
      </CardContent>
    </Card>
  );
}
