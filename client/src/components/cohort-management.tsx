import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { X, UserPlus, ShieldCheck, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CohortMember {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  membershipId?: number;
  membershipRole?: string;
}

export function CohortManagement({ cohortId }: { cohortId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{id: number; name: string} | null>(null);

  // Check if the current user is a moderator of this cohort
  const { data: moderatorStatus, isLoading: isCheckingModerator } = useQuery({
    queryKey: ["/api/cohort", cohortId, "is-moderator"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cohort/${cohortId}/is-moderator`);
      return await res.json();
    },
  });

  // Get all members of the cohort
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["/api/cohort", cohortId, "members"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cohort/${cohortId}/members`);
      return await res.json();
    },
    enabled: !!moderatorStatus?.isModerator || user?.role === "admin",
  });

  // Create a new membership
  const addMemberMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      // First, find the user by email
      const userResponse = await apiRequest("GET", `/api/user/find-by-email?email=${data.email}`);
      const foundUser = await userResponse.json();
      
      if (!foundUser || !foundUser.id) {
        throw new Error("User not found with that email address");
      }
      
      // Then create a membership for that user
      const response = await apiRequest("POST", "/api/cohort-membership", {
        userId: foundUser.id,
        cohortId,
        role: "member"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member added to the cohort",
      });
      setInviteEmail("");
      setAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cohort", cohortId, "members"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add member to cohort",
        variant: "destructive",
      });
    }
  });

  // Update a membership role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: number; role: string }) => {
      const response = await apiRequest("PUT", `/api/cohort-membership/${membershipId}`, { role });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member role updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cohort", cohortId, "members"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member role",
        variant: "destructive",
      });
    }
  });

  // Remove a member from the cohort
  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: number) => {
      const response = await apiRequest("DELETE", `/api/cohort-membership/${membershipId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member removed from cohort",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cohort", cohortId, "members"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member from cohort",
        variant: "destructive",
      });
    }
  });

  // If user is not a moderator and not an admin, don't render the component
  if ((!moderatorStatus?.isModerator && user?.role !== "admin") && !isCheckingModerator) {
    return null;
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim() === "") return;
    
    addMemberMutation.mutate({ email: inviteEmail });
  };

  const toggleRole = (member: CohortMember) => {
    if (!member.membershipId) return;
    
    const newRole = member.membershipRole === "moderator" ? "member" : "moderator";
    updateRoleMutation.mutate({ membershipId: member.membershipId, role: newRole });
  };

  const initializeRemoveMember = (member: CohortMember) => {
    if (member.membershipId) {
      setMemberToRemove({
        id: member.membershipId,
        name: member.fullName
      });
      setRemoveDialogOpen(true);
    }
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.id);
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    }
  };

  return (
    <>
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cohort Management</span>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a new member</DialogTitle>
                  <DialogDescription>
                    Enter the email address of the user you want to add to this cohort.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMember}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={addMemberMutation.isPending}>
                      {addMemberMutation.isPending ? "Adding..." : "Add to Cohort"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingMembers ? (
            <div className="text-center py-4">Loading members...</div>
          ) : (
            <div className="space-y-4">
              {members && members.length > 0 ? (
                <div className="divide-y">
                  {members.map((member: CohortMember) => (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{member.fullName}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.membershipRole === "moderator" && (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Moderator
                          </Badge>
                        )}
                        <div className="flex gap-2">
                          {member.id !== user?.id && member.membershipId && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleRole(member)}
                                disabled={updateRoleMutation.isPending}
                              >
                                {member.membershipRole === "moderator" ? (
                                  <>
                                    <Shield className="h-3 w-3 mr-1" />
                                    Remove Mod
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    Make Mod
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => initializeRemoveMember(member)}
                                disabled={removeMemberMutation.isPending}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No members found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Remove Member Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from this cohort? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setMemberToRemove(null)}>
                Cancel
              </Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={confirmRemoveMember}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}