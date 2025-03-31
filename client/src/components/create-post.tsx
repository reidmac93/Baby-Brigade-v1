import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { insertPostSchema } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImageIcon, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreatePostProps {
  cohortId: number;
}

export function CreatePost({ cohortId }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const postMutation = useMutation({
    mutationFn: async (data: { content: string; cohortId: number; photoUrl?: string }) => {
      const validated = insertPostSchema.parse(data);
      const res = await apiRequest("POST", "/api/posts", validated);
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      setPhotoUrl(null);
      // Invalidate the posts query to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['/api/cohorts', cohortId, 'posts'] });
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    
    const postData: { content: string; cohortId: number; photoUrl?: string } = {
      content,
      cohortId
    };
    
    if (photoUrl) {
      postData.photoUrl = photoUrl;
    }
    
    postMutation.mutate(postData);
  };
  
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
      setPhotoUrl(reader.result as string);
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
    setPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Textarea
          placeholder="Share your parenting journey..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] mb-4"
        />
        
        {photoUrl && (
          <div className="relative mb-4">
            <img 
              src={photoUrl} 
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
        
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePhotoClick}
            disabled={isUploading || postMutation.isPending}
            className={cn(photoUrl ? "bg-primary/10" : "")}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className={cn("h-4 w-4", photoUrl ? "text-primary" : "")} />
            )}
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={postMutation.isPending || !content.trim()}
            className="w-full"
          >
            {postMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}