import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { insertPostSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreatePostProps {
  cohortId: number;
}

export function CreatePost({ cohortId }: CreatePostProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const postMutation = useMutation({
    mutationFn: async (data: { content: string; cohortId: number }) => {
      const validated = insertPostSchema.parse(data);
      const res = await apiRequest("POST", "/api/posts", validated);
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      // Invalidate the posts query to refresh the feed
      queryClient.invalidateQueries({ queryKey: [`/api/cohort/${cohortId}/posts`] });
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
    postMutation.mutate({ content, cohortId });
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
      </CardContent>
    </Card>
  );
}