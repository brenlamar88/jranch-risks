import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

interface Risk {
  id: string;
  rap_number: string;
  risk_description: string;
  risk_level: string;
  status: string;
  target_completion_date: string;
  responsible_person: string;
  departments?: { name: string };
  updated_at?: string;
  completion_percentage?: number;
}

interface RiskCardProps {
  risk: Risk;
  onEdit: (risk: Risk) => void;
  onDelete?: (risk: Risk) => void;
  showDelete?: boolean;
}

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case "5":
      return "bg-risk-critical text-white";
    case "4":
      return "bg-risk-high text-white";
    case "3":
      return "bg-risk-medium text-white";
    case "2":
      return "bg-risk-low text-white";
    case "1":
      return "bg-risk-minimal text-foreground";
    default:
      return "bg-muted";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-success text-success-foreground";
    case "in_progress":
      return "bg-info text-info-foreground";
    case "overdue":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const RiskCard = ({ risk, onEdit, onDelete, showDelete = false }: RiskCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-muted-foreground">{risk.rap_number}</p>
            <p className="text-sm mt-1 line-clamp-2 uppercase">{risk.risk_description}</p>
          </div>
          <div className="flex shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(risk)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {showDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(risk)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={getRiskLevelColor(risk.risk_level)}>
            Level {risk.risk_level}
          </Badge>
          <Badge className={getStatusColor(risk.status)}>
            {risk.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Completion:</span>
            <div className="flex items-center gap-2 flex-1 max-w-[60%]">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${risk.completion_percentage ?? 0}%` }}
                />
              </div>
              <span className="font-medium tabular-nums text-xs w-9 text-right">
                {risk.completion_percentage ?? 0}%
              </span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Department:</span>
            <span className="font-medium">{risk.departments?.name || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Responsible:</span>
            <span className="font-medium truncate ml-2">{risk.responsible_person}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Date:</span>
            <span className="font-medium">
              {format(new Date(risk.target_completion_date), "MMM dd, yyyy")}
            </span>
          </div>
          {risk.updated_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated:</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(risk.updated_at), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskCard;
