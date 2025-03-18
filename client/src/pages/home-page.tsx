import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Baby, Cohort, Post } from "@shared/schema";
import { CohortCard } from "@/components/cohort-card";
import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { Loader2 } from "lucide-react";

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

  if (isBabyLoading || isCohortLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!baby) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to BabyConnect!</h1>
          <p className="text-muted-foreground mb-4">
            To get started, please add your baby's information in your profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <img
              src="https://images.unsplash.com/photo-1517554558809-9b4971b38f39"
              alt="Family activities"
              className="rounded-lg shadow-lg"
            />
            <img
              src="https://images.unsplash.com/photo-1596673325912-423fb1425a5e"
              alt="Family bonding"
              className="rounded-lg shadow-lg hidden md:block"
            />
            <img
              src="https://images.unsplash.com/photo-1612297561428-6ca218aec064"
              alt="Family moment"
              className="rounded-lg shadow-lg hidden lg:block"
            />
          </div>
        </div>
      </div>
    );
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
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Parenting Tips</h3>
            <div className="grid grid-cols-1 gap-4">
              <img
                src="https://images.unsplash.com/photo-1648137974441-f786b8783fa3"
                alt="Parenting moment"
                className="rounded-lg shadow-md"
              />
              <img
                src="https://images.unsplash.com/photo-1651431936616-b9dd60d16eb8"
                alt="Baby care"
                className="rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
