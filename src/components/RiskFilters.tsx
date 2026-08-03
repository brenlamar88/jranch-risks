import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Building2 } from "lucide-react";

interface RiskFiltersProps {
  departments: Array<{ id: string; name: string }>;
  users: Array<{ id: string; full_name: string }>;
  facilities?: Array<{ id: string; name: string }>;
  showFacilityFilter?: boolean;
  selectedFacility?: string;
  setSelectedFacility?: (value: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (value: string) => void;
  selectedUser: string;
  setSelectedUser: (value: string) => void;
  selectedRiskLevel: string;
  setSelectedRiskLevel: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const RiskFilters = ({
  departments,
  users,
  facilities = [],
  showFacilityFilter = false,
  selectedFacility = "all",
  setSelectedFacility,
  selectedDepartment,
  setSelectedDepartment,
  selectedUser,
  setSelectedUser,
  selectedRiskLevel,
  setSelectedRiskLevel,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  searchTerm,
  setSearchTerm,
}: RiskFiltersProps) => {
  const clearFilters = () => {
    setSelectedDepartment("all");
    setSelectedUser("all");
    setSelectedRiskLevel("all");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    if (setSelectedFacility) setSelectedFacility("all");
  };

  const hasActiveFilters =
    selectedDepartment !== "all" ||
    selectedUser !== "all" ||
    selectedRiskLevel !== "all" ||
    selectedFacility !== "all" ||
    startDate ||
    endDate ||
    searchTerm;

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {showFacilityFilter && facilities.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Facility
            </Label>
            <Select value={selectedFacility} onValueChange={setSelectedFacility}>
              <SelectTrigger>
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {[...facilities].sort((a, b) => a.name.localeCompare(b.name)).map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Search risks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {[...departments].sort((a,b)=>a.name.localeCompare(b.name)).map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>User</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Risk Level</Label>
          <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
            <SelectTrigger>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="5">Level 5 - Critical</SelectItem>
              <SelectItem value="4">Level 4 - High</SelectItem>
              <SelectItem value="3">Level 3 - Medium</SelectItem>
              <SelectItem value="2">Level 2 - Low</SelectItem>
              <SelectItem value="1">Level 1 - Minimal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default RiskFilters;