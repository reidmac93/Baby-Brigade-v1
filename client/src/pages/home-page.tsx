import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Baby, Cohort, Post, User } from "@shared/schema";
import { CohortCard } from "@/components/cohort-card";
import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Redirect, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CohortList } from "@/components/cohort-list";

type PostWithUser = Post & { user: User };

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  // Track post IDs that have been seen
  const [seenPostIds, setSeenPostIds] = useState<Set<number>>(new Set());
  // Track if there are new posts since last view
  const [hasNewPosts, setHasNewPosts] = useState(false);
  // Active cohort ID state
  const [activeCohortId, setActiveCohortId] = useState<number | undefined>(undefined);
  // State for the create cohort dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch user's cohorts
  const { data: userCohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/user/cohorts"],
  });

  // Initialize active cohort from user's cohorts when they load
  useEffect(() => {
    if (userCohorts.length > 0 && !activeCohortId) {
      setActiveCohortId(userCohorts[0].id);
    }
  }, [userCohorts, activeCohortId]);

  // Directly get the active cohort from the userCohorts
  const activeCohort = userCohorts.find(c => c.id === activeCohortId);

  const { 
    data: posts = [], 
    isLoading: isPostsLoading,
    isFetching: isPostsFetching,
    refetch: refetchPosts
  } = useQuery<PostWithUser[]>({
    queryKey: ["/api/cohorts", activeCohortId, "posts"],
    enabled: !!activeCohortId,
    refetchInterval: 10000, // Refetch posts every 10 seconds
  });
  
  // Check for new posts when posts are fetched
  useEffect(() => {
    if (posts.length > 0) {
      const currentPostIds = new Set(posts.map(post => post.id));
      const newPosts = posts.filter(post => !seenPostIds.has(post.id));
      
      if (newPosts.length > 0 && seenPostIds.size > 0) {
        setHasNewPosts(true);
      }
      
      // Update seen posts after showing new post indicator
      setSeenPostIds(currentPostIds);
    }
  }, [posts]);
  
  // Function to handle manual refresh
  const handleManualRefresh = () => {
    refetchPosts();
    setHasNewPosts(false); // Clear the new posts indicator
  };

  // Function to handle cohort selection
  const handleCohortChange = (cohortId: number) => {
    setActiveCohortId(cohortId);
    setSeenPostIds(new Set()); // Reset seen posts when changing cohorts
    setHasNewPosts(false);
  };

  // Loading state while waiting for cohorts
  if (userCohorts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">Welcome to BabyConnect</h1>
          <p className="text-center mb-8">You're not a member of any cohorts yet.</p>
          
          <div className="space-y-4">
            <Button 
              onClick={() => navigate("/profile")} 
              className="w-full"
            >
              <Users className="mr-2 h-4 w-4" />
              Create Your First Cohort
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar with Cohort Info */}
        <div className="lg:w-1/4">
          {activeCohort && (
            <>
              <div className="mb-4">
                <CohortSwitcher 
                  currentCohortId={activeCohortId}
                  onCohortChange={handleCohortChange}
                  onCreateClick={() => setCreateDialogOpen(true)}
                  className="w-full"
                />
              </div>
              <CohortCard cohort={activeCohort} baby={null} />
            </>
          )}
        </div>

        {/* Main Content - Post Wall */}
        <div className="lg:w-3/4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold">{activeCohort?.name} Feed</h2>
            </div>
            <div className="flex items-center gap-3">
              {isPostsFetching && !isPostsLoading && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Refreshing...
                </div>
              )}
              {hasNewPosts && !isPostsFetching && (
                <Badge variant="default" className="animate-pulse">
                  New posts available
                </Badge>
              )}
              <Button 
                onClick={handleManualRefresh} 
                variant={hasNewPosts ? "default" : "outline"}
                size="sm"
                disabled={isPostsFetching}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          <div className="space-y-6">
            {activeCohortId && <CreatePost cohortId={activeCohortId} />}
            {isPostsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} user={post.user} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No posts yet. Be the first to share something with your cohort!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Cohort Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create a New Cohort</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <CohortList />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}