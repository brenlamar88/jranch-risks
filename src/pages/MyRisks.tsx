import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import RiskTable from "@/components/RiskTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MyRisks = () => {
  const [risks, setRisks] = useState<any[]>([]);
  const [filteredRisks, setFilteredRisks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchMyRisks();
  }, []);

  useEffect(() => {
    filterRisks();
  }, [risks, searchTerm, statusFilter]);

  const fetchMyRisks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("risks")
        .select("*, departments(name)")
        .contains("responsible_person_id", [user.id])
        .order("created_at", { ascending: false });

      setRisks(data || []);
    }
  };

  const filterRisks = () => {
    let filtered = [...risks];

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.rap_number.toLowerCase().includes(term) ||
          r.risk_description.toLowerCase().includes(term) ||
          r.action_plan.toLowerCase().includes(term)
      );
    }

    setFilteredRisks(filtered);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">My Risks</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          View and manage risks assigned to you
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search your risks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Risks ({filteredRisks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskTable risks={filteredRisks} onUpdate={fetchMyRisks} />
        </CardContent>
      </Card>
    </div>
  );
};

export default MyRisks;