import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Printer, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import EditRiskForm from "./EditRiskForm";
import RiskCard from "./RiskCard";
import PrintRisksView from "./PrintRisksView";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Risk {
  id: string;
  rap_number: string;
  risk_description: string;
  risk_level: string;
  status: string;
  target_completion_date: string;
  responsible_person: string;
  departments?: { name: string };
  created_by_user?: { full_name: string };
  action_plan?: string;
  root_cause?: string;
  date_identified?: string;
  priority_level?: string;
  priority_status?: string;
  completion_percentage?: number;
  actual_completion_date?: string;
  updated_at?: string;
  visibility?: string;
}

interface RiskTableProps {
  risks: Risk[];
  onUpdate?: () => void;
  selectable?: boolean;
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

const RiskTable = ({ risks, onUpdate, selectable = false }: RiskTableProps) => {
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(new Set());
  const [showPrintView, setShowPrintView] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<Risk | null>(null);
  const [updatedSortDir, setUpdatedSortDir] = useState<"none" | "desc" | "asc">("none");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { isAdmin } = useIsAdmin();

  const toggleUpdatedSort = () => {
    setUpdatedSortDir((prev) =>
      prev === "none" ? "desc" : prev === "desc" ? "asc" : "none"
    );
  };

  const sortedRisks = useMemo(
    () =>
      updatedSortDir === "none"
        ? risks
        : [...risks].sort((a, b) => {
            const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return updatedSortDir === "desc" ? tb - ta : ta - tb;
          }),
    [risks, updatedSortDir]
  );

  const totalPages = Math.max(1, Math.ceil(sortedRisks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const displayedRisks = sortedRisks.slice(startIdx, startIdx + pageSize);
  const endIdx = startIdx + displayedRisks.length;

  // Reset to first page when filter/sort changes the dataset
  useEffect(() => {
    setPage(1);
  }, [risks, pageSize, updatedSortDir]);

  const handleEdit = (risk: Risk) => {
    setEditingRisk(risk);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (risk: Risk) => {
    setRiskToDelete(risk);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!riskToDelete) return;

    const { error } = await supabase
      .from("risks")
      .delete()
      .eq("id", riskToDelete.id);

    if (error) {
      toast.error("Failed to delete risk: " + error.message);
    } else {
      toast.success(`Risk ${riskToDelete.rap_number} deleted successfully`);
      if (onUpdate) {
        onUpdate();
      }
    }

    setDeleteDialogOpen(false);
    setRiskToDelete(null);
  };

  const handleEditSuccess = () => {
    if (onUpdate) {
      onUpdate();
    }
  };

  const toggleRiskSelection = (riskId: string) => {
    const newSelected = new Set(selectedRisks);
    if (newSelected.has(riskId)) {
      newSelected.delete(riskId);
    } else {
      newSelected.add(riskId);
    }
    setSelectedRisks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRisks.size === risks.length) {
      setSelectedRisks(new Set());
    } else {
      setSelectedRisks(new Set(risks.map(r => r.id)));
    }
  };

  const getSelectedRisks = () => {
    return risks.filter(risk => selectedRisks.has(risk.id));
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };

  if (showPrintView) {
    return <PrintRisksView risks={getSelectedRisks()} />;
  }

  return (
    <>
      {editingRisk && (
        <EditRiskForm
          risk={editingRisk}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={handleEditSuccess}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete risk <strong>{riskToDelete?.rap_number}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Selection Actions Bar */}
      {selectable && selectedRisks.size > 0 && (
        <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedRisks.size} risk(s) selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedRisks(new Set())}>
              Clear Selection
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Selected
            </Button>
          </div>
        </div>
      )}
      
      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-3">
        {displayedRisks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No risks found matching your criteria
          </div>
        ) : (
          displayedRisks.map((risk) => (
            <div key={risk.id} className="flex items-start gap-2">
              {selectable && (
                <Checkbox
                  checked={selectedRisks.has(risk.id)}
                  onCheckedChange={() => toggleRiskSelection(risk.id)}
                  className="mt-4"
                />
              )}
              <div className="flex-1">
                <RiskCard 
                  risk={risk} 
                  onEdit={handleEdit} 
                  onDelete={handleDeleteClick}
                  showDelete={isAdmin}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={risks.length > 0 && selectedRisks.size === risks.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="px-2">RAP #</TableHead>
              <TableHead className="px-2">Description</TableHead>
              <TableHead className="px-2">Risk Level</TableHead>
              <TableHead className="px-2">Status</TableHead>
              <TableHead className="px-2 w-32">Completion</TableHead>
              <TableHead className="px-2">Department</TableHead>
              <TableHead className="px-2">Responsible</TableHead>
              <TableHead className="px-2">Submitted By</TableHead>
              <TableHead className="px-2">Due Date</TableHead>
              <TableHead className="px-2">
                <button
                  type="button"
                  onClick={toggleUpdatedSort}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Last Updated
                  {updatedSortDir === "none" && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  {updatedSortDir === "desc" && <ArrowDown className="h-3 w-3" />}
                  {updatedSortDir === "asc" && <ArrowUp className="h-3 w-3" />}
                </button>
              </TableHead>
              <TableHead className="sticky right-0 bg-background shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] px-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRisks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectable ? 12 : 11} className="text-center text-muted-foreground py-8">
                  No risks found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              displayedRisks.map((risk) => (
                <TableRow key={risk.id} className={selectedRisks.has(risk.id) ? "bg-muted/50" : ""}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRisks.has(risk.id)}
                        onCheckedChange={() => toggleRiskSelection(risk.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{risk.rap_number}</span>
                      {risk.visibility === "corporate_only" && (
                        <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Corporate Only
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate uppercase px-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">{risk.risk_description}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          {risk.risk_description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="px-2">
                    <Badge className={getRiskLevelColor(risk.risk_level)}>
                      Level {risk.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2">
                    <Badge className={getStatusColor(risk.status)}>
                      {risk.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 w-32">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${risk.completion_percentage ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                        {risk.completion_percentage ?? 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2">{risk.departments?.name || "N/A"}</TableCell>
                  <TableCell className="px-2">{risk.responsible_person}</TableCell>
                  <TableCell className="px-2">{risk.created_by_user?.full_name || "N/A"}</TableCell>
                  <TableCell className="px-2">
                    {format(new Date(risk.target_completion_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="px-2">
                    {risk.updated_at ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground cursor-default">
                              {formatDistanceToNow(new Date(risk.updated_at), { addSuffix: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(risk.updated_at), "PPpp")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={`sticky right-0 px-2 ${selectedRisks.has(risk.id) ? "bg-muted/50" : "bg-background"} shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]`}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(risk)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(risk)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {sortedRisks.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startIdx + 1}</span>–
            <span className="font-medium text-foreground">{endIdx}</span> of{" "}
            <span className="font-medium text-foreground">{sortedRisks.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums min-w-[80px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default RiskTable;