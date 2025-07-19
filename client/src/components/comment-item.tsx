import { type CommentWithUser } from "../shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface CommentItemProps {
  comment: CommentWithUser;
}

export function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="flex gap-2">
      <Avatar className="w-8 h-8">
        <AvatarImage src={comment.user.avatarUrl || ""} alt={comment.user.displayName} />
        <AvatarFallback>{comment.user.displayName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 bg-muted p-3 rounded-lg">
        <div className="flex justify-between items-start">
          <h5 className="font-medium text-sm">{comment.user.displayName}</h5>
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm mt-1">{comment.content}</p>
      </div>
    </div>
  );
}
