import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, KeyRound, Trash2, Lock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  job_title?: string;
  company_id?: string;
}

interface Company {
  id: string;
  name: string;
}

interface UserManagementTableProps {
  users: User[];
  companies: Company[];
  onUpdateRole: (userId: string, newRole: string) => void;
  onUpdateJobTitle: (userId: string, jobTitle: string) => void;
  onUpdateName: (userId: string, name: string) => void;
  onUpdateCompany: (userId: string, companyId: string) => void;
  onDeleteUser: (userId: string) => void;
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-primary text-primary-foreground";
    case "manager":
      return "bg-info text-info-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const UserManagementTable = ({ users, companies, onUpdateRole, onUpdateJobTitle, onUpdateName, onUpdateCompany, onDeleteUser }: UserManagementTableProps) => {
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [setPasswordUser, setSetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const { toast } = useToast();

  const handleSendInvite = async (userId: string, email: string) => {
    setSendingInvite(userId);
    try {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { email },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({
        title: "Invite sent",
        description: `Invitation sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error sending invite",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setSendingInvite(null);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    setResettingPassword(userId);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) throw error;
      toast({
        title: "Reset email sent",
        description: `Password reset link sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error sending reset",
        description: error.message || "Failed to send password reset",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(null);
    }
  };

  const handleSetPassword = async () => {
    if (!setPasswordUser) return;
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    setSettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: setPasswordUser.id, password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Password updated", description: `Password has been set for ${setPasswordUser.email}` });
      setSetPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error setting password", description: error.message, variant: "destructive" });
    } finally {
      setSettingPassword(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUser(userId);
    await onDeleteUser(userId);
    setDeletingUser(null);
  };

  const DeleteUserButton = ({ userId, userName, size = "sm" }: { userId: string; userName: string; size?: "sm" | "default" }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size={size}
          className="gap-1"
          disabled={deletingUser === userId}
        >
          <Trash2 className="h-3 w-3" />
          {deletingUser === userId ? "Deleting..." : "Delete"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {userName || "this user"}? This action cannot be undone and will permanently remove the user account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDeleteUser(userId)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Role:</span>
                <Badge className={getRoleBadgeColor(user.role)}>
                  {user.role}
                </Badge>
              </div>

              <div className="space-y-2">
                <Input
                  value={user.full_name}
                  onChange={(e) => onUpdateName(user.id, e.target.value)}
                  placeholder="Enter name"
                />

                <Select
                  value={user.role}
                  onValueChange={(value) => onUpdateRole(user.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  value={user.job_title || ""}
                  onChange={(e) => onUpdateJobTitle(user.id, e.target.value)}
                  placeholder="Enter job title"
                />

                <Select
                  value={user.company_id || ""}
                  onValueChange={(value) => onUpdateCompany(user.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleSendInvite(user.id, user.email)}
                  disabled={sendingInvite === user.id}
                >
                  <Send className="h-4 w-4" />
                  {sendingInvite === user.id ? "Sending..." : "Send Invite"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleResetPassword(user.id, user.email)}
                  disabled={resettingPassword === user.id}
                >
                  <KeyRound className="h-4 w-4" />
                  {resettingPassword === user.id ? "Sending..." : "Reset Password"}
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={() => setSetPasswordUser(user)}
              >
                <Lock className="h-4 w-4" />
                Set Password
              </Button>
              <DeleteUserButton userId={user.id} userName={user.full_name} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Input
                    value={user.full_name}
                    onChange={(e) => onUpdateName(user.id, e.target.value)}
                    placeholder="Enter name"
                    className="w-48"
                  />
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Input
                    value={user.job_title || ""}
                    onChange={(e) => onUpdateJobTitle(user.id, e.target.value)}
                    placeholder="Enter job title"
                    className="w-40"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={user.company_id || ""}
                    onValueChange={(value) => onUpdateCompany(user.id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(value) => onUpdateRole(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleSendInvite(user.id, user.email)}
                      disabled={sendingInvite === user.id}
                    >
                      <Send className="h-3 w-3" />
                      {sendingInvite === user.id ? "Sending..." : "Invite"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleResetPassword(user.id, user.email)}
                      disabled={resettingPassword === user.id}
                    >
                      <KeyRound className="h-3 w-3" />
                      {resettingPassword === user.id ? "Sending..." : "Reset PW"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      onClick={() => setSetPasswordUser(user)}
                    >
                      <Lock className="h-3 w-3" />
                      Set PW
                    </Button>
                    <DeleteUserButton userId={user.id} userName={user.full_name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Set Password Dialog */}
      <Dialog open={!!setPasswordUser} onOpenChange={(open) => { if (!open) { setSetPasswordUser(null); setNewPassword(""); setConfirmPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>
              Set a new password for {setPasswordUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSetPasswordUser(null); setNewPassword(""); setConfirmPassword(""); }}>
              Cancel
            </Button>
            <Button onClick={handleSetPassword} disabled={settingPassword}>
              {settingPassword ? "Setting..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagementTable;
