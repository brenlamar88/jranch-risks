import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import RiskFilters from "@/components/RiskFilters";
import RiskTable from "@/components/RiskTable";
import CreateRiskForm from "@/components/CreateRiskForm";
import RiskLevelsByDepartmentChart from "@/components/RiskLevelsByDepartmentChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useFacilityAccess } from "@/hooks/useFacilityAccess";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Dashboard = () => {
  const [risks, setRisks] = useState<any[]>([]);
  const [filteredRisks, setFilteredRisks] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hideCompleted, setHideCompleted] = useState(true);

  const { accessibleFacilities, hasMultiFacilityAccess, loading: facilityLoading } = useFacilityAccess();

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel("risks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "risks" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterRisks();
  }, [risks, selectedFacility, selectedDepartment, selectedUser, selectedRiskLevel, startDate, endDate, searchTerm, hideCompleted]);

  const fetchData = async () => {
    // Fetch risks in batches to overcome the 1000-row default limit
    let allRisks: any[] = [];
    const batchSize = 1000;
    for (let i = 0; i < 6; i++) {
      const from = i * batchSize;
      const to = from + batchSize - 1;
      const { data } = await supabase
        .from("risks")
        .select("*, departments(name), companies(name), created_by_user:users!risks_created_by_fkey(full_name)")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (data && data.length > 0) {
        allRisks = allRisks.concat(data);
      }
      if (!data || data.length < batchSize) break;
    }

    const { data: deptsData } = await supabase.from("departments").select("*");
    const { data: usersData } = await supabase.from("users").select("id, full_name, company_id");

    setRisks(allRisks);
    setDepartments(deptsData || []);
    setUsers(usersData || []);
  };

  const filterRisks = () => {
    let filtered = [...risks];

    if (hideCompleted) {
      filtered = filtered.filter((r) => r.status !== "completed");
    }

    if (selectedFacility !== "all") {
      // Show risks that:
      // 1. Belong to the selected facility (company_id matches), OR
      // 2. Have any responsible person who belongs to the selected facility
      filtered = filtered.filter((r) => {
        // Check if risk's company matches
        if (r.company_id === selectedFacility) return true;
        
        // Check if any responsible person belongs to the selected facility
        const responsibleIds = r.responsible_person_id || [];
        const hasResponsibleInFacility = responsibleIds.some((userId: string) => {
          const user = users.find(u => u.id === userId);
          return user?.company_id === selectedFacility;
        });
        
        return hasResponsibleInFacility;
      });
    }

    if (selectedDepartment !== "all") {
      filtered = filtered.filter((r) => r.department_id === selectedDepartment);
    }

    if (selectedUser !== "all") {
      filtered = filtered.filter((r) => {
        const responsibleIds = r.responsible_person_id || [];
        return responsibleIds.includes(selectedUser);
      });
    }

    if (selectedRiskLevel !== "all") {
      filtered = filtered.filter((r) => r.risk_level === selectedRiskLevel);
    }

    if (startDate) {
      filtered = filtered.filter((r) => new Date(r.date_identified) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter((r) => new Date(r.target_completion_date) <= new Date(endDate));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.rap_number.toLowerCase().includes(term) ||
          r.risk_description.toLowerCase().includes(term) ||
          r.action_plan.toLowerCase().includes(term) ||
          r.responsible_person.toLowerCase().includes(term)
      );
    }

    setFilteredRisks(filtered);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stats = {
    total: risks.length,
    completed: risks.filter((r) => r.status === "completed").length,
    inProgress: risks.filter((r) => r.status === "in_progress" || r.status === "open").length,
    overdue: risks.filter((r) => {
      const targetDate = new Date(r.target_completion_date);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate < today && r.status !== "completed";
    }).length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Risk Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Monitor and manage all risks across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="hide-completed"
              checked={hideCompleted}
              onCheckedChange={setHideCompleted}
            />
            <Label htmlFor="hide-completed" className="text-sm text-muted-foreground">Hide Completed</Label>
          </div>
          <CreateRiskForm />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Risks</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      <RiskFilters
        departments={departments}
        users={users}
        facilities={accessibleFacilities}
        showFacilityFilter={hasMultiFacilityAccess}
        selectedFacility={selectedFacility}
        setSelectedFacility={setSelectedFacility}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        selectedRiskLevel={selectedRiskLevel}
        setSelectedRiskLevel={setSelectedRiskLevel}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <RiskLevelsByDepartmentChart 
        risks={filteredRisks} 
        onDepartmentClick={(departmentId) => setSelectedDepartment(departmentId)}
      />

      <div className="md:relative md:left-1/2 md:right-1/2 md:-mx-[50vw] md:w-screen md:px-3 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>All Risks ({filteredRisks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskTable risks={filteredRisks} onUpdate={fetchData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;