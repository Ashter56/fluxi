import { useState, useEffect } from "react";
import { Check, Copy, Twitter, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface ShareTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
}

export function ShareTaskModal({ isOpen, onClose, taskId, taskTitle }: ShareTaskModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  
  useEffect(() => {
    // Generate the share URL using the current hostname and task ID
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/share/${taskId}`;
    setShareUrl(url);
  }, [taskId]);
  
  // Handle direct link copy
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
      
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard."
      });
    });
  };
  
  // Handle Twitter sharing
  const shareOnTwitter = () => {
    const text = `Check out this task on Fluxion: "${taskTitle}" ${shareUrl}`;
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, "_blank");
  };
  
  // Handle WhatsApp sharing
  const shareOnWhatsApp = () => {
    const text = `Help me with this: "${taskTitle}" ${shareUrl}`;
    const encodedText = encodeURIComponent(text);
    const whatsAppUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsAppUrl, "_blank");
  };
  
  // Track share analytics
  const trackShare = (platform: string) => {
    // In a real app, we would log this share to the database
    console.log(`Shared task ${taskId} on ${platform} at ${new Date().toISOString()}`);
    
    // For a complete implementation, we would make an API call to track this
    // fetch('/api/tasks/${taskId}/shares', {
    //   method: 'POST',
    //   body: JSON.stringify({ platform, timestamp: new Date() })
    // });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Task</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="link">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="twitter">Twitter</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="mt-4">
            <div className="flex items-center space-x-2">
              <Input 
                value={shareUrl} 
                readOnly 
                className="flex-1"
              />
              <Button size="icon" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Share this link with anyone to view this task.
            </p>
          </TabsContent>
          
          <TabsContent value="twitter" className="mt-4">
            <Button 
              className="w-full"
              onClick={() => {
                shareOnTwitter();
                trackShare("twitter");
              }}
            >
              <Twitter className="mr-2 h-4 w-4" />
              Share on Twitter
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Tweet this task to your followers.
            </p>
          </TabsContent>
          
          <TabsContent value="whatsapp" className="mt-4">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => {
                shareOnWhatsApp();
                trackShare("whatsapp");
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share on WhatsApp
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Send this task to your WhatsApp contacts.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}