import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Users, CalendarDays, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePost } from "@/components/create-post";
import { PostCard } from "@/components/post-card";
import { CohortManagement } from "@/components/cohort-management";
import { Cohort, Post, User } from "@shared/schema";

export default function CohortPage() {
  const [match, params] = useRoute<{ id: string }>("/cohorts/:id");
  const cohortId = match ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("feed");

  // Fetch cohort details
  const { 
    data: cohort, 
    isLoading: isLoadingCohort,
    error: cohortError
  } = useQuery<Cohort>({
    queryKey: ["/api/cohorts", cohortId],
    enabled: !!cohortId && !isNaN(cohortId),
  });

  // Fetch posts for this cohort
  const { 
    data: posts = [], 
    isLoading: isLoadingPosts,
    error: postsError,
    refetch: refetchPosts
  } = useQuery<Post[]>({
    queryKey: ["/api/cohorts", cohortId, "posts"],
    enabled: !!cohortId && !isNaN(cohortId),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch user's moderator status
  const { 
    data: isModerator = false,
    isLoading: isLoadingModStatus
  } = useQuery<boolean>({
    queryKey: ["/api/cohorts", cohortId, "is-moderator"],
    enabled: !!cohortId && !isNaN(cohortId) && !!user,
  });

  // If cohort doesn't exist, show not found
  if (cohortError) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Cohort Not Found</CardTitle>
            <CardDescription>
              The cohort you're looking for doesn't exist or you don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/profile">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" asChild className="mr-4">
          <Link href="/profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isLoadingCohort ? <Skeleton className="h-10 w-48" /> : cohort?.name}
          </h1>
          {isLoadingCohort ? (
            <Skeleton className="h-5 w-72 mt-1" />
          ) : (
            <p className="text-muted-foreground">
              {cohort?.description || "A place to connect with others in your cohort"}
            </p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            {(isModerator || user?.role === "admin" || cohort?.creatorId === user?.id) && (
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Manage
              </TabsTrigger>
            )}
          </TabsList>
          
          <div>
            {user && cohort && (
              <Button 
                onClick={() => refetchPosts()} 
                variant="outline" 
                size="sm"
              >
                Refresh
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="feed" className="space-y-4">
          {user && cohort && (
            <CreatePost cohortId={cohortId} />
          )}

          {isLoadingPosts ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : postsError ? (
            <Card>
              <CardContent className="py-4">
                <p className="text-red-500">Error loading posts. Please try again later.</p>
              </CardContent>
            </Card>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .map((post) => (
                  <PostCard key={post.id} post={post} user={user as User} />
                ))
              }
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          {isLoadingCohort ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Cohort Members
                </CardTitle>
                <CardDescription>
                  All members of this cohort
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Members list will be displayed here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage">
          {cohort && <CohortManagement cohortId={cohortId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}