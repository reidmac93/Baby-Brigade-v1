import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cohort } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CohortSwitcherProps {
  currentCohortId?: number;
  onCohortChange?: (cohortId: number) => void;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  className?: string;
}

export function CohortSwitcher({ 
  currentCohortId, 
  onCohortChange,
  showCreateButton = true,
  onCreateClick,
  className = "",
}: CohortSwitcherProps) {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Query to get user's cohorts
  const { data: cohorts = [], isLoading } = useQuery<Cohort[]>({
    queryKey: ["/api/user/cohorts"],
  });

  // Get current cohort details
  const currentCohort = cohorts.find(c => c.id === currentCohortId);
  
  const handleCohortSelect = (cohortId: number) => {
    if (onCohortChange) {
      onCohortChange(cohortId);
    } else {
      // If no callback, navigate to cohort page
      navigate(`/cohorts/${cohortId}`);
    }
    setIsOpen(false);
  };

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      // Default: Navigate to profile page where users can create cohorts
      navigate("/profile");
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`justify-between ${className}`}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4" />
            <span className="truncate">
              {isLoading 
                ? "Loading cohorts..." 
                : currentCohort 
                  ? currentCohort.name 
                  : cohorts.length > 0 
                    ? "Select a cohort" 
                    : "No cohorts available"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Your Cohorts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {cohorts.length === 0 ? (
          <DropdownMenuItem disabled>
            You don't have any cohorts yet
          </DropdownMenuItem>
        ) : (
          <ScrollArea className="h-56">
            {cohorts.map((cohort) => (
              <DropdownMenuItem 
                key={cohort.id}
                onClick={() => handleCohortSelect(cohort.id)}
                className="flex justify-between items-center"
              >
                <span className="truncate">{cohort.name}</span>
                {currentCohortId === cohort.id && (
                  <Badge variant="outline" className="ml-2">Current</Badge>
                )}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        
        {showCreateButton && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateClick} className="text-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create New Cohort
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}