import { Post, User } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface PostCardProps {
  post: Post;
  user: User;
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
            {format(new Date(post.createdAt), "PPp")}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{post.content}</p>
      </CardContent>
    </Card>
  );
}
