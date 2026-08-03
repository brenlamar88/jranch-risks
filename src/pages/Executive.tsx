import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import RiskTable from "@/components/RiskTable";
import RiskLevelsByDepartmentChart from "@/components/RiskLevelsByDepartmentChart";
import HighRiskByFacilityChart from "@/components/HighRiskByFacilityChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertOctagon, Flame, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const EXECUTIVE_EMAILS = ["jreed@freedomhc.com", "schisholm@freedomhc.com"];

const Executive = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [risks, setRisks] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  const [selectedFacility, setSelectedFacility] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [hideCompleted, setHideCompleted] = useState(true);
  const [viewFilter, setViewFilter] = useState<"all" | "level5" | "level4" | "overdue">("all");
  const [sortBy, setSortBy] = useState<"default" | "updated_desc" | "updated_asc">("default");

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase() || "";
      const allowedByEmail = EXECUTIVE_EMAILS.includes(email);
      setAuthorized(allowedByEmail || isAdmin);
      setAuthChecked(true);
    };
    if (!adminLoading) checkAccess();
  }, [adminLoading, isAdmin]);

  useEffect(() => {
    if (!authorized) return;
    fetchData();

    const channel = supabase
      .channel("executive-risks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "risks" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized]);

  const fetchData = async () => {
    let allRisks: any[] = [];
    const batchSize = 1000;
    for (let i = 0; i < 6; i++) {
      const from = i * batchSize;
      const to = from + batchSize - 1;
      const { data } = await supabase
        .from("risks")
        .select("*, departments(name), companies(name), created_by_user:users!risks_created_by_fkey(full_name)")
        .in("risk_level", ["4", "5"])
        .order("created_at", { ascending: false })
        .range(from, to);
      if (data && data.length > 0) {
        allRisks = allRisks.concat(data);
      }
      if (!data || data.length < batchSize) break;
    }

    const [{ data: deptsData }, { data: facData }] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("companies").select("*").order("name"),
    ]);

    setRisks(allRisks);
    setDepartments(deptsData || []);
    setFacilities(facData || []);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredRisks = risks.filter((r) => {
    if (viewFilter === "level5" && r.risk_level !== "5") return false;
    if (viewFilter === "level4" && r.risk_level !== "4") return false;
    if (viewFilter === "overdue") {
      const td = new Date(r.target_completion_date);
      td.setHours(0, 0, 0, 0);
      if (!(td < today && r.status !== "completed")) return false;
    }
    if (hideCompleted && viewFilter !== "overdue" && r.status === "completed") return false;
    if (selectedFacility !== "all" && r.company_id !== selectedFacility) return false;
    if (selectedDepartment !== "all" && r.department_id !== selectedDepartment) return false;
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      const haystack = [
        r.rap_number,
        r.risk_description,
        r.action_plan,
        r.responsible_person,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(t)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "updated_desc" || sortBy === "updated_asc") {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return sortBy === "updated_desc" ? tb - ta : ta - tb;
    }
    // Level 5 first, then Level 4
    const la = parseInt(a.risk_level, 10) || 0;
    const lb = parseInt(b.risk_level, 10) || 0;
    return lb - la;
  });

  const stats = {
    total: risks.length,
    level5: risks.filter((r) => r.risk_level === "5").length,
    level4: risks.filter((r) => r.risk_level === "4").length,
    overdue: risks.filter((r) => {
      const targetDate = new Date(r.target_completion_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate < today && r.status !== "completed";
    }).length,
  };

  if (!authChecked || adminLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">Loading…</div>
    );
  }

  if (!authorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not authorized</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You do not have access to the Executive Risk Dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Executive Risk Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Critical &amp; High Risks (Level 4 &amp; 5) — All Facilities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="exec-hide-completed"
            checked={hideCompleted}
            onCheckedChange={setHideCompleted}
          />
          <Label htmlFor="exec-hide-completed" className="text-sm text-muted-foreground">
            Hide Completed
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card
          onClick={() => setViewFilter("all")}
          className={`cursor-pointer transition hover:shadow-md ${viewFilter === "all" ? "ring-2 ring-primary" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total L4 + L5</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setViewFilter(viewFilter === "level5" ? "all" : "level5")}
          className={`cursor-pointer transition hover:shadow-md ${viewFilter === "level5" ? "ring-2 ring-destructive" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Level 5</CardTitle>
            <Flame className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.level5}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Click to view</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setViewFilter(viewFilter === "level4" ? "all" : "level4")}
          className={`cursor-pointer transition hover:shadow-md ${viewFilter === "level4" ? "ring-2 ring-warning" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Level 4</CardTitle>
            <AlertOctagon className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.level4}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Click to view</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setViewFilter(viewFilter === "overdue" ? "all" : "overdue")}
          className={`cursor-pointer transition hover:shadow-md ${viewFilter === "overdue" ? "ring-2 ring-destructive" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.overdue}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Click to view</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Facility</Label>
              <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {[...departments].sort((a,b)=>a.name.localeCompare(b.name)).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sort By</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (Risk Level)</SelectItem>
                  <SelectItem value="updated_desc">Recently Updated</SelectItem>
                  <SelectItem value="updated_asc">Oldest Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Search RAP, description…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <RiskLevelsByDepartmentChart
        risks={filteredRisks}
        onDepartmentClick={(departmentId) => setSelectedDepartment(departmentId)}
      />

      <HighRiskByFacilityChart
        risks={filteredRisks}
        onFacilityClick={(facilityId) => setSelectedFacility(facilityId)}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {viewFilter === "level5" && `Level 5 Risks (${filteredRisks.length})`}
            {viewFilter === "level4" && `Level 4 Risks (${filteredRisks.length})`}
            {viewFilter === "overdue" && `Overdue Risks (${filteredRisks.length})`}
            {viewFilter === "all" && `Critical & High Risks (${filteredRisks.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RiskTable risks={filteredRisks} onUpdate={fetchData} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Executive;
