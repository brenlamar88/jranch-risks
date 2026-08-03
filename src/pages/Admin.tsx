import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users as UsersIcon, UserPlus, Search } from "lucide-react";
import UserManagementTable from "@/components/UserManagementTable";
import CSVImportRisks from "@/components/CSVImportRisks";
import FindDuplicatesTool from "@/components/FindDuplicatesTool";
import CreateUserDialog from "@/components/CreateUserDialog";

const Admin = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isCreatingUsers, setIsCreatingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: companiesData } = await supabase
      .from("companies")
      .select("*")
      .order("name");

    setUsers(usersData || []);
    setCompanies(companiesData || []);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role updated",
        description: "User role has been successfully updated",
      });
      fetchData();
    }
  };

  const updateUserJobTitle = async (userId: string, jobTitle: string) => {
    const { error } = await supabase
      .from("users")
      .update({ job_title: jobTitle })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error updating job title",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Job title updated",
        description: "User job title has been successfully updated",
      });
      fetchData();
    }
  };

  const updateUserName = async (userId: string, name: string) => {
    const { error } = await supabase
      .from("users")
      .update({ full_name: name })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error updating name",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Name updated",
        description: "User name has been successfully updated",
      });
      fetchData();
    }
  };

  const updateUserCompany = async (userId: string, companyId: string) => {
    const { error } = await supabase
      .from("users")
      .update({ company_id: companyId })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error updating facility",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Facility updated",
        description: "User facility has been successfully updated",
      });
      fetchData();
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({
        title: "User deleted",
        description: "User has been successfully removed",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const bulkCreateUsers = async () => {
    setIsCreatingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-create-users');
      
      if (error) throw error;
      
      toast({
        title: "Users created",
        description: `Successfully created ${data.results.filter((r: any) => r.status === 'success').length} users. Default password: FreedomRAP2024!`,
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error creating users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingUsers(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage users and their permissions
            </p>
          </div>
        </div>
        <CreateUserDialog onUserCreated={fetchData} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "admin").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulk Actions</CardTitle>
            <UserPlus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Button 
              onClick={bulkCreateUsers} 
              disabled={isCreatingUsers}
              className="w-full"
            >
              {isCreatingUsers ? "Creating..." : "Add Team Users"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <CSVImportRisks />

      <FindDuplicatesTool />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>User Management</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          <UserManagementTable
            users={filteredUsers}
            companies={companies}
            onUpdateRole={updateUserRole}
            onUpdateJobTitle={updateUserJobTitle}
            onUpdateName={updateUserName}
            onUpdateCompany={updateUserCompany}
            onDeleteUser={deleteUser}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;