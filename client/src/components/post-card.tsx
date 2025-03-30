import { Post, User } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, formatRelative, formatDistance, isToday, isYesterday } from "date-fns";

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
  return (
    <Card>
      <CardHeader className="flex-row space-x-4 space-y-0">
        <Avatar>
          <AvatarFallback>
            {user.fullName.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none">{user.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(new Date(post.createdAt!))}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{post.content}</p>
      </CardContent>
    </Card>
  );
}