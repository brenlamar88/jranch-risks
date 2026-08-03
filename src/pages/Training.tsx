import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle } from "lucide-react";

const Training = () => {
  const [acknowledged, setAcknowledged] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    toast({
      title: "Training Acknowledged",
      description: "Your training acknowledgment has been recorded.",
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Training</h1>

      <Card>
        <CardHeader>
          <CardTitle>Training Video</CardTitle>
          <CardDescription>Watch the training video below before acknowledging completion.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <video
              src="/training-video.mp4"
              controls
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training Acknowledgment</CardTitle>
          <CardDescription>Please confirm that you have completed the training.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
              I acknowledge that I have watched the training video and understand the risk management procedures and policies outlined within.
            </Label>
          </div>
          <Button onClick={handleSubmit} disabled={!acknowledged}>
            Submit Acknowledgment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Training;
