import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Baby, Cohort, Post } from "@shared/schema";
import { CohortCard } from "@/components/cohort-card";
import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

export default function HomePage() {
  const { user } = useAuth();

  const { data: baby, isLoading: isBabyLoading } = useQuery<Baby>({
    queryKey: ["/api/baby"],
  });

  const { data: posts, isLoading: isPostsLoading } = useQuery<Post[]>({
    queryKey: ["/api/cohort", baby?.cohortId, "posts"],
    enabled: !!baby?.cohortId,
  });

  const { data: cohort, isLoading: isCohortLoading } = useQuery<Cohort>({
    queryKey: ["/api/cohort", baby?.cohortId],
    enabled: !!baby?.cohortId,
  });

  if (isBabyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to profile if baby information is not provided
  if (!baby) {
    return <Redirect to="/profile" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">Recent Posts</h2>
          <div className="space-y-6">
            <CreatePost cohortId={baby.cohortId} />
            {isPostsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              posts?.map((post) => (
                <PostCard key={post.id} post={post} user={user!} />
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          {cohort && <CohortCard cohort={cohort} baby={baby} />}
        </div>
      </div>
    </div>
  );
}