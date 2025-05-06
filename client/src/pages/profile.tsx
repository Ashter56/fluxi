import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { UserWithStats } from "@shared/schema";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Heart, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function Profile() {
  const { id } = useParams();
  const userId = id ? parseInt(id) : undefined;

  const { data: userProfile, isLoading, error } = useQuery<UserWithStats>({
    queryKey: [`/api/users/${userId}/profile`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <>
        <Header showBackButton title="Profile" />
        <ProfileSkeleton />
        <BottomNavigation />
      </>
    );
  }

  if (error || !userProfile) {
    return (
      <>
        <Header showBackButton title="Profile" />
        <div className="p-4 mt-32 text-center text-muted-foreground">
          Failed to load profile. User may not exist.
        </div>
        <BottomNavigation />
      </>
    );
  }

  // Mock recent activity for UI purposes
  const recentActivity = [
    {
      type: "completed",
      title: "User Flow Diagrams",
      time: "2 days ago"
    },
    {
      type: "liked",
      title: "Sarah's UI Component Library",
      time: "3 days ago"
    },
    {
      type: "created",
      title: "Wireframe Exploration",
      time: "5 days ago"
    }
  ];

  return (
    <>
      <Header showBackButton title="Profile" />

      <div className="bg-white pb-20">
        {/* Profile Header */}
        <div className="relative">
          <div className="h-32 bg-primary"></div>
          
          <div className="absolute top-16 left-0 w-full flex flex-col items-center">
            <Avatar className="w-24 h-24 border-4 border-white">
              <AvatarImage src={userProfile.avatarUrl || ""} alt={userProfile.displayName} />
              <AvatarFallback className="text-2xl">{userProfile.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg mt-2">{userProfile.displayName}</h3>
            <p className="text-muted-foreground text-sm">{userProfile.bio}</p>
          </div>
        </div>
        
        {/* Profile Stats */}
        <div className="mt-32 p-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-muted p-3 rounded-xl flex flex-col items-center">
              <span className="text-xl font-semibold">{userProfile.stats.totalTasks}</span>
              <span className="text-xs text-muted-foreground">Total Tasks</span>
            </div>
            <div className="bg-muted p-3 rounded-xl flex flex-col items-center">
              <span className="text-xl font-semibold text-secondary">{userProfile.stats.completed}</span>
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <div className="bg-muted p-3 rounded-xl flex flex-col items-center">
              <span className="text-xl font-semibold text-[#e17055]">{userProfile.stats.pending}</span>
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
          </div>
          
          {/* Most-Liked Tasks Section */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Most-Liked Tasks</h3>
            {userProfile.popularTasks.length > 0 ? (
              <div className="space-y-3">
                {userProfile.popularTasks.map((task) => (
                  <div key={task.id} className="bg-muted p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        <StatusBadge status={task.status} className="text-[10px] px-2 py-0.5" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      <span className="text-sm">{task.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-lg text-center text-muted-foreground">
                No tasks found
              </div>
            )}
          </div>
          
          {/* Recent Activity */}
          <div>
            <h3 className="font-semibold mb-3">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex gap-3">
                  <div className="bg-muted rounded-full p-2 h-min">
                    {activity.type === "completed" && <Check className="h-4 w-4 text-secondary" />}
                    {activity.type === "liked" && <Heart className="h-4 w-4 text-red-500" />}
                    {activity.type === "created" && <Plus className="h-4 w-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm">
                      {activity.type === "completed" && "Completed "}
                      {activity.type === "liked" && "Liked "}
                      {activity.type === "created" && "Created "}
                      <span className="font-medium">{activity.title}</span>
                    </p>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="bg-white pb-20">
      <div className="relative">
        <div className="h-32 bg-primary"></div>
        
        <div className="absolute top-16 left-0 w-full flex flex-col items-center">
          <Skeleton className="w-24 h-24 rounded-full border-4 border-white" />
          <Skeleton className="h-6 w-32 mt-2" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
      </div>
      
      <div className="mt-32 p-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="space-y-3 mb-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
