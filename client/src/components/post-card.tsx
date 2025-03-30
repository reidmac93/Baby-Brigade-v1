import { Post, User } from "@shared/schema";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, formatRelative, formatDistance, isToday, isYesterday } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PostCardProps {
  post: Post;
  user: User;
}

// Function to format the post time in a user-friendly way
function formatTime(date: Date): string {
  const now = new Date();
  
  // If the post is from today, show relative time (e.g., "5 minutes ago")
  if (isToday(date)) {
    return formatDistance(date, now, { addSuffix: true });
  }
  
  // If the post is from yesterday, show "Yesterday at 2:30 PM"
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }
  
  // For older posts, show the date and time
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

export function PostCard({ post, user }: PostCardProps) {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  
  // Check if current user is the post author
  const isAuthor = currentUser && currentUser.id === post.userId;
  
  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number, content: string }) => {
      const res = await apiRequest("PUT", `/api/posts/${id}`, { content });
      return res.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      // Invalidate to refresh posts
      queryClient.invalidateQueries({ queryKey: ['/api/cohorts', post.cohortId, 'posts'] });
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        variant: "destructive",
      });
    },
  });
  
  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/posts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate to refresh posts
      queryClient.invalidateQueries({ queryKey: ['/api/cohorts', post.cohortId, 'posts'] });
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const handleUpdatePost = () => {
    if (editedContent.trim() === "") return;
    updateMutation.mutate({ id: post.id, content: editedContent });
  };

  const handleDeletePost = () => {
    deleteMutation.mutate(post.id);
    setShowDeleteDialog(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(post.content); // Reset to original content
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start space-x-4 space-y-0">
        <Avatar>
          <AvatarFallback>
            {user.fullName.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium leading-none">{user.fullName}</p>
            {isAuthor && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatTime(new Date(post.createdAt!))}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[100px] mb-2"
          />
        ) : (
          <p className="whitespace-pre-wrap">{post.content}</p>
        )}
      </CardContent>

      {isEditing && (
        <CardFooter className="flex justify-end gap-2 pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelEdit}
            disabled={updateMutation.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUpdatePost}
            disabled={updateMutation.isPending || editedContent.trim() === ""}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </CardFooter>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}