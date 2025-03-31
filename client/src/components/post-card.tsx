import { Post, User, Comment } from "@shared/schema";
import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { format, formatDistance, isToday, isYesterday } from "date-fns";
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  X, 
  Check, 
  Loader2, 
  Heart, 
  MessageSquare,
  ImageIcon,
  Send
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

// Comment component
function CommentItem({ 
  comment, 
  onDelete, 
  onUpdate 
}: { 
  comment: any;
  onDelete: (id: number) => void;
  onUpdate: (id: number, content: string) => void;
}) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const isAuthor = user && user.id === comment.userId;
  
  const handleUpdateComment = () => {
    if (editedContent.trim() === "") return;
    onUpdate(comment.id, editedContent);
    setIsEditing(false);
  };
  
  return (
    <div className="flex gap-2 py-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">
          {comment.fullName?.split(" ").map((n: string) => n[0]).join("") || "?"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-sm font-medium">{comment.fullName || comment.username}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {formatTime(new Date(comment.createdAt))}
            </span>
          </div>
          
          {isAuthor && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-3 w-3" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(comment.id)}>
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="text-sm h-8"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(comment.content);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleUpdateComment}
                disabled={editedContent.trim() === ""}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm">{comment.content}</p>
        )}
      </div>
    </div>
  );
}

export function PostCard({ post, user }: PostCardProps) {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedPhotoUrl, setEditedPhotoUrl] = useState(post.photoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Check if current user is the post author
  const isAuthor = currentUser && currentUser.id === post.userId;
  
  // Fetch upvote count and user's upvote status
  const { data: upvoteData } = useQuery({
    queryKey: ['/api/posts', post.id, 'upvotes/count'],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/posts/${post.id}/upvotes/count`);
      return res.json();
    },
    staleTime: 10000, // 10 seconds
  });
  
  const { data: userUpvoteData } = useQuery({
    queryKey: ['/api/posts', post.id, 'upvotes/user'],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/posts/${post.id}/upvotes/user`);
      return res.json();
    },
    staleTime: 10000, // 10 seconds
  });
  
  // Fetch comments when expanded
  const { data: comments } = useQuery({
    queryKey: ['/api/posts', post.id, 'comments'],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/posts/${post.id}/comments`);
      return res.json();
    },
    enabled: showComments,
  });
  
  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, content, photoUrl }: { id: number, content: string, photoUrl?: string | null }) => {
      const res = await apiRequest("PUT", `/api/posts/${id}`, { content, photoUrl });
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
  
  // Upvote mutations
  const upvoteMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", "/api/upvotes", { postId });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate upvote queries
      queryClient.invalidateQueries({ queryKey: ['/api/posts', post.id, 'upvotes/count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts', post.id, 'upvotes/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upvote post",
        variant: "destructive",
      });
    },
  });
  
  const removeUpvoteMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("DELETE", `/api/posts/${postId}/upvotes`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate upvote queries
      queryClient.invalidateQueries({ queryKey: ['/api/posts', post.id, 'upvotes/count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts', post.id, 'upvotes/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove upvote",
        variant: "destructive",
      });
    },
  });
  
  // Comment mutations
  const addCommentMutation = useMutation({
    mutationFn: async (data: { postId: number, content: string }) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/posts', post.id, 'comments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });
  
  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number, content: string }) => {
      const res = await apiRequest("PUT", `/api/comments/${id}`, { content });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/posts', post.id, 'comments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update comment",
        variant: "destructive",
      });
    },
  });
  
  const deleteCommentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/comments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/posts', post.id, 'comments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleUpdatePost = () => {
    if (editedContent.trim() === "") return;
    updateMutation.mutate({ 
      id: post.id, 
      content: editedContent,
      photoUrl: editedPhotoUrl 
    });
  };

  const handleDeletePost = () => {
    deleteMutation.mutate(post.id);
    setShowDeleteDialog(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(post.content); // Reset to original content
    setEditedPhotoUrl(post.photoUrl || null); // Reset photo URL
  };
  
  // Toggle upvote
  const toggleUpvote = () => {
    if (userUpvoteData?.hasUpvoted) {
      removeUpvoteMutation.mutate(post.id);
    } else {
      upvoteMutation.mutate(post.id);
    }
  };
  
  // Add a comment
  const addComment = () => {
    if (newComment.trim() === "") return;
    addCommentMutation.mutate({ 
      postId: post.id, 
      content: newComment 
    });
  };
  
  // Handle photo upload for editing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image is too large. Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = () => {
      setEditedPhotoUrl(reader.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read the image file.",
        variant: "destructive",
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };
  
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };
  
  const removePhoto = () => {
    setEditedPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="overflow-hidden">
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
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px]"
            />
            
            {editedPhotoUrl && (
              <div className="relative">
                <img 
                  src={editedPhotoUrl} 
                  alt="Preview" 
                  className="max-h-48 rounded-md object-contain bg-muted"
                />
                <button 
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-background rounded-full p-1 shadow-sm"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <div className="flex justify-end gap-2">
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
                variant="outline"
                size="sm"
                onClick={handlePhotoClick}
                disabled={isUploading || updateMutation.isPending}
                type="button"
                className={cn(editedPhotoUrl ? "bg-primary/10" : "")}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ImageIcon className={cn("h-4 w-4 mr-1", editedPhotoUrl ? "text-primary" : "")} />
                )}
                {editedPhotoUrl ? "Change Photo" : "Add Photo"}
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
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap">{post.content}</p>
            
            {post.photoUrl && (
              <img 
                src={post.photoUrl} 
                alt="Post attachment" 
                className="max-h-96 rounded-md object-contain bg-muted mx-auto"
              />
            )}
          </div>
        )}
      </CardContent>

      {!isEditing && (
        <CardFooter className="py-2 px-6 flex justify-between">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleUpvote}
              disabled={upvoteMutation.isPending || removeUpvoteMutation.isPending}
              className={cn(
                "flex items-center gap-1 px-2", 
                userUpvoteData?.hasUpvoted ? "text-primary" : ""
              )}
            >
              <Heart 
                className={cn(
                  "h-4 w-4", 
                  userUpvoteData?.hasUpvoted ? "fill-primary" : ""
                )} 
              />
              <span className="text-xs">
                {upvoteData?.count || 0}
              </span>
            </Button>
            
            <Collapsible 
              open={showComments} 
              onOpenChange={setShowComments}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-1 px-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">
                    {comments?.length || 0}
                  </span>
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardFooter>
      )}
      
      {/* Comments section */}
      {showComments && !isEditing && (
        <>
          <Separator />
          <div className="p-4 pt-0">
            <CollapsibleContent className="pt-2">
              {/* Comment input */}
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {currentUser?.fullName.split(" ").map((n) => n[0]).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  onClick={addComment}
                  disabled={addCommentMutation.isPending || !newComment.trim()}
                  className="h-9 px-3"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Comments list */}
              <div className="space-y-1 mt-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment: any) => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      onDelete={(id) => deleteCommentMutation.mutate(id)}
                      onUpdate={(id, content) => updateCommentMutation.mutate({ id, content })}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </>
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