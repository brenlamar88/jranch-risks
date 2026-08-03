import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

interface RiskRow {
  id: string;
  rap_number: string;
  risk_description: string;
  company_id: string | null;
  date_identified: string;
  created_at: string | null;
  responsible_person: string;
  companies?: { name: string } | null;
}

interface DuplicateGroup {
  key: string;
  description: string;
  companyName: string;
  dateIdentified: string;
  risks: RiskRow[];
}

const FindDuplicatesTool = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<RiskRow | null>(null);
  const [pendingGroupDelete, setPendingGroupDelete] = useState<DuplicateGroup | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const { toast } = useToast();

  const oldestOf = (g: DuplicateGroup) =>
    [...g.risks].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    })[0];

  const scan = async () => {
    setIsScanning(true);
    try {
      const all: RiskRow[] = [];
      const batchSize = 1000;
      for (let i = 0; i < 10; i++) {
        const { data, error } = await supabase
          .from("risks")
          .select("id, rap_number, risk_description, company_id, date_identified, created_at, responsible_person, companies(name)")
          .order("created_at", { ascending: true })
          .range(i * batchSize, i * batchSize + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as any));
        if (data.length < batchSize) break;
      }

      const map = new Map<string, RiskRow[]>();
      for (const r of all) {
        const desc = (r.risk_description || "").trim().toLowerCase();
        const key = `${desc}||${r.company_id || "none"}||${r.date_identified}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      }

      const dupGroups: DuplicateGroup[] = [];
      map.forEach((risks, key) => {
        if (risks.length > 1) {
          dupGroups.push({
            key,
            description: risks[0].risk_description,
            companyName: risks[0].companies?.name || "—",
            dateIdentified: risks[0].date_identified,
            risks,
          });
        }
      });

      dupGroups.sort((a, b) => b.risks.length - a.risks.length);
      setGroups(dupGroups);
      setHasScanned(true);
      toast({
        title: "Scan complete",
        description: `Found ${dupGroups.length} duplicate groups (${dupGroups.reduce((s, g) => s + g.risks.length, 0)} total risks).`,
      });
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const toggle = (key: string) => {
    const next = new Set(expanded);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpanded(next);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("risks").delete().eq("id", pendingDelete.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Risk deleted", description: `${pendingDelete.rap_number} removed.` });
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, risks: g.risks.filter((r) => r.id !== pendingDelete.id) }))
          .filter((g) => g.risks.length > 1)
      );
    }
    setPendingDelete(null);
  };

  const confirmGroupDelete = async () => {
    if (!pendingGroupDelete) return;
    const keep = oldestOf(pendingGroupDelete);
    const idsToDelete = pendingGroupDelete.risks.filter((r) => r.id !== keep.id).map((r) => r.id);
    const { error } = await supabase.from("risks").delete().in("id", idsToDelete);
    if (error) {
      toast({ title: "Bulk delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Duplicates removed",
        description: `Kept ${keep.rap_number}, deleted ${idsToDelete.length} copies.`,
      });
      setGroups((prev) => prev.filter((g) => g.key !== pendingGroupDelete.key));
    }
    setPendingGroupDelete(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Duplicate Risks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Groups risks that share the same description, facility, and date identified. Review each group and delete duplicates manually.
        </p>
        <Button onClick={scan} disabled={isScanning}>
          <Search className="mr-2 h-4 w-4" />
          {isScanning ? "Scanning..." : hasScanned ? "Re-scan" : "Scan for Duplicates"}
        </Button>

        {hasScanned && groups.length === 0 && (
          <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
            No duplicate groups found.
          </div>
        )}

        {groups.length > 0 && (
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium">{groups.length} duplicate groups</span>
              <Badge variant="outline">
                {groups.reduce((s, g) => s + g.risks.length, 0)} total risks
              </Badge>
            </div>
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y">
                {groups.map((g) => {
                  const isOpen = expanded.has(g.key);
                  return (
                    <div key={g.key}>
                      <div className="w-full p-3 hover:bg-muted/30 flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
                        <button
                          onClick={() => toggle(g.key)}
                          className="flex items-start gap-2 flex-1 min-w-0 text-left"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="destructive">{g.risks.length} copies</Badge>
                              <span className="text-sm text-muted-foreground">
                                {g.companyName} · {g.dateIdentified}
                              </span>
                            </div>
                            <div className="text-sm font-medium break-words mt-1">{g.description}</div>
                          </div>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingGroupDelete(g);
                          }}
                          className="shrink-0 self-end sm:self-start"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Keep oldest
                        </Button>
                      </div>
                      {isOpen && (
                        <div className="bg-muted/20 border-t divide-y">
                          {g.risks.map((r) => {
                            const isOldest = r.id === oldestOf(g).id;
                            return (
                            <div key={r.id} className="p-3 pl-10 flex items-center gap-3 text-sm">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium flex items-center gap-2">
                                  {r.rap_number}
                                  {isOldest && <Badge variant="outline" className="text-xs">oldest</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Assigned: {r.responsible_person} · Created:{" "}
                                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                                </div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setPendingDelete(r)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this risk?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes RAP {pendingDelete?.rap_number}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!pendingGroupDelete}
          onOpenChange={(open) => !open && setPendingGroupDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Keep oldest, delete the rest?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingGroupDelete && (
                  <>
                    This keeps RAP <strong>{oldestOf(pendingGroupDelete).rap_number}</strong> (oldest)
                    and permanently deletes the other{" "}
                    <strong>{pendingGroupDelete.risks.length - 1}</strong> duplicate
                    {pendingGroupDelete.risks.length - 1 === 1 ? "" : "s"}. This cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmGroupDelete}>
                Delete duplicates
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default FindDuplicatesTool;
