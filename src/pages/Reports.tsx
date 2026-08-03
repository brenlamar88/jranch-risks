import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Sheet, Check, ChevronsUpDown, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import RiskTable from "@/components/RiskTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
const Reports = () => {
  const [risks, setRisks] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("Risk Management Report");
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchAllRisks = async () => {
    const pageSize = 1000;
    let from = 0;
    const all: any[] = [];
    // Batched fetch to bypass Supabase's default 1000-row cap
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from("risks")
        .select("*, departments(name), companies(name)")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !data) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  };

  const fetchData = async () => {
    const [risksAll, deptsRes, companiesRes, usersRes] = await Promise.all([
      fetchAllRisks(),
      supabase.from("departments").select("*"),
      supabase.from("companies").select("*").order("name"),
      supabase.from("users").select("id, full_name"),
    ]);

    setRisks(risksAll);
    setDepartments(deptsRes.data || []);
    setCompanies(companiesRes.data || []);
    const sortedUsers = (usersRes.data || []).slice().sort((a: any, b: any) =>
      (a.full_name || "").toLowerCase().localeCompare((b.full_name || "").toLowerCase())
    );
    setUsers(sortedUsers);
  };

  const getFilteredRisks = () => {
    // Show all risks (no description-based deduplication) so identical wording
    // across different facilities/departments is preserved in reports.
    let filtered = [...risks].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (selectedCompany !== "all") {
      filtered = filtered.filter((r) => r.company_id === selectedCompany);
    }

    if (selectedDepartments.length > 0) {
      filtered = filtered.filter((r) => selectedDepartments.includes(r.department_id));
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    if (selectedRiskLevels.length > 0) {
      filtered = filtered.filter((r) => selectedRiskLevels.includes(r.risk_level));
    }

    if (selectedUsers.length > 0) {
      filtered = filtered.filter((r) =>
        Array.isArray(r.responsible_person_id) &&
        r.responsible_person_id.some((id: string) => selectedUsers.includes(id))
      );
    }

    if (startDate) {
      filtered = filtered.filter((r) => new Date(r.created_at) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter((r) => new Date(r.created_at) <= new Date(endDate));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        [
          r.risk_description,
          r.action_plan,
          r.root_cause,
          r.responsible_person,
          r.rap_number,
          r.companies?.name,
          r.departments?.name,
        ]
          .filter(Boolean)
          .some((field: string) => String(field).toLowerCase().includes(q))
      );
    }

    return filtered;
  };

  const exportToPDF = () => {
    const filtered = getFilteredRisks();
    const doc = new jsPDF({ orientation: "landscape" });

    // Title
    doc.setFontSize(18);
    doc.text("Risk Management Report", 14, 20);

    // Report date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    // Filter info
    let filterText = "Filters: ";
    const filters = [];
    if (selectedCompany !== "all") {
      const company = companies.find((c) => c.id === selectedCompany);
      filters.push(`Company: ${company?.name || "Unknown"}`);
    }
    if (selectedDepartments.length > 0) {
      const deptNames = selectedDepartments.map(id => departments.find((d) => d.id === id)?.name || "Unknown").join(", ");
      filters.push(`Department: ${deptNames}`);
    }
    if (selectedStatus !== "all") filters.push(`Status: ${selectedStatus}`);
    if (selectedRiskLevels.length > 0) filters.push(`Risk Level: ${selectedRiskLevels.map(l => `Level ${l}`).join(", ")}`);
    if (selectedUsers.length > 0) {
      const userNames = selectedUsers.map(id => users.find((u) => u.id === id)?.full_name || "Unknown").join(", ");
      filters.push(`User: ${userNames}`);
    }
    if (startDate) filters.push(`From: ${startDate}`);
    if (endDate) filters.push(`To: ${endDate}`);
    filterText += filters.length > 0 ? filters.join(" | ") : "None";
    doc.text(filterText, 14, 34);

    // Table
    const headers = [
      "Company",
      "Department",
      "Level",
      "Risk Description",
      "Actions Taken to Mitigate Risks/Strategy",
      "Success/Completion Indicators",
      "Status",
      "Responsible",
      "Identified",
      "Target Date",
      "RAP #",
    ];

    const data = filtered.map((risk) => [
      risk.companies?.name || "N/A",
      risk.departments?.name || "N/A",
      `Level ${risk.risk_level}`,
      risk.risk_description || "",
      risk.action_plan || "",
      risk.root_cause || "",
      risk.status || "",
      risk.responsible_person || "",
      risk.date_identified || "",
      risk.target_completion_date || "",
      risk.rap_number || "",
    ]);

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 40,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 13 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 30 },
        6: { cellWidth: 16 },
        7: { cellWidth: 22 },
        8: { cellWidth: 16 },
        9: { cellWidth: 16 },
        10: { cellWidth: 16 },
      },
    });

    // Footer with page count
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }

    doc.save(`risks-report-${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "Export successful",
      description: "Report has been exported to PDF",
    });
  };

  const exportToExcel = () => {
    const filtered = getFilteredRisks();

    const rows = filtered.map((risk) => ({
      "Company": risk.companies?.name || "N/A",
      "Department": risk.departments?.name || "N/A",
      "Risk Level": `Level ${risk.risk_level}`,
      "Risk Description": risk.risk_description || "",
      "Actions Taken to Mitigate Risks/Strategy": risk.action_plan || "",
      "Success/Completion Indicators": risk.root_cause || "",
      "Status": risk.status || "",
      "Responsible Person": risk.responsible_person || "",
      "Date Identified": risk.date_identified || "",
      "Target Completion Date": risk.target_completion_date || "",
      "RAP #": risk.rap_number || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Risks Report");

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] || "").length)),
    }));
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `risks-report-${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Export successful",
      description: "Report has been exported to Excel",
    });
  };

  const getFilterLabels = () => {
    const filters: string[] = [];
    if (selectedCompany !== "all") {
      const company = companies.find((c) => c.id === selectedCompany);
      filters.push(`Company: ${company?.name || "Unknown"}`);
    }
    if (selectedDepartments.length > 0) {
      const deptNames = selectedDepartments.map(id => departments.find((d) => d.id === id)?.name || "Unknown").join(", ");
      filters.push(`Department: ${deptNames}`);
    }
    if (selectedStatus !== "all") filters.push(`Status: ${selectedStatus}`);
    if (selectedRiskLevels.length > 0) filters.push(`Risk Level: ${selectedRiskLevels.map(l => `Level ${l}`).join(", ")}`);
    if (selectedUsers.length > 0) {
      const userNames = selectedUsers.map(id => users.find((u) => u.id === id)?.full_name || "Unknown").join(", ");
      filters.push(`User: ${userNames}`);
    }
    if (startDate) filters.push(`From: ${startDate}`);
    if (endDate) filters.push(`To: ${endDate}`);
    return filters;
  };

  const sendReportEmail = async () => {
    const recipients = emailTo.split(",").map((e) => e.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast({ title: "Error", description: "Please enter at least one email address", variant: "destructive" });
      return;
    }

    setSendingEmail(true);
    const filtered = getFilteredRisks();
    const risksData = filtered.map((risk) => ({
      rap_number: risk.rap_number,
      risk_description: risk.risk_description,
      action_plan: risk.action_plan,
      root_cause: risk.root_cause,
      risk_level: risk.risk_level,
      status: risk.status,
      company_name: risk.companies?.name || "N/A",
      department_name: risk.departments?.name || "N/A",
      responsible_person: risk.responsible_person,
      date_identified: risk.date_identified,
      target_completion_date: risk.target_completion_date,
    }));

    try {
      const { data, error } = await supabase.functions.invoke("send-report-email", {
        body: {
          to: recipients,
          subject: emailSubject,
          risks: risksData,
          filters: getFilterLabels(),
        },
      });

      if (error) throw error;

      toast({ title: "Email sent", description: `Report sent to ${recipients.join(", ")}` });
      setEmailDialogOpen(false);
      setEmailTo("");
    } catch (err: any) {
      toast({ title: "Failed to send email", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredRisks = getFilteredRisks();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Reports</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Generate and export risk management reports
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label>Search</Label>
              <Input
                placeholder="Search description, action plan, RAP #, responsible person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-10 font-normal"
                  >
                    {selectedDepartments.length === 0
                      ? "All Departments"
                      : selectedDepartments.length === 1
                        ? departments.find(d => d.id === selectedDepartments[0])?.name
                        : `${selectedDepartments.length} departments selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search departments..." />
                    <CommandList>
                      <CommandEmpty>No department found.</CommandEmpty>
                      <CommandGroup>
                        {[...departments].sort((a,b)=>a.name.localeCompare(b.name)).map((dept) => (
                          <CommandItem
                            key={dept.id}
                            value={dept.name}
                            onSelect={() => {
                              setSelectedDepartments(prev =>
                                prev.includes(dept.id)
                                  ? prev.filter(id => id !== dept.id)
                                  : [...prev, dept.id]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDepartments.includes(dept.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {dept.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>User</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-10 font-normal"
                  >
                    {selectedUsers.length === 0
                      ? "All Users"
                      : selectedUsers.length === 1
                        ? users.find(u => u.id === selectedUsers[0])?.full_name
                        : `${selectedUsers.length} selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={u.full_name}
                            onSelect={() => {
                              setSelectedUsers(prev =>
                                prev.includes(u.id)
                                  ? prev.filter(id => id !== u.id)
                                  : [...prev, u.id]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUsers.includes(u.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {u.full_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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

            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-10 font-normal"
                  >
                    {selectedRiskLevels.length === 0
                      ? "All Levels"
                      : selectedRiskLevels.length === 1
                        ? `Level ${selectedRiskLevels[0]}`
                        : `${selectedRiskLevels.length} levels selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {[
                          { value: "5", label: "Level 5 - Critical" },
                          { value: "4", label: "Level 4 - High" },
                          { value: "3", label: "Level 3 - Medium" },
                          { value: "2", label: "Level 2 - Low" },
                          { value: "1", label: "Level 1 - Minimal" },
                        ].map((level) => (
                          <CommandItem
                            key={level.value}
                            value={level.label}
                            onSelect={() => {
                              setSelectedRiskLevels(prev =>
                                prev.includes(level.value)
                                  ? prev.filter(v => v !== level.value)
                                  : [...prev, level.value]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedRiskLevels.includes(level.value) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {level.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={exportToPDF} className="gap-2 w-full sm:w-auto">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Export to PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button onClick={exportToExcel} variant="outline" className="gap-2 w-full sm:w-auto">
              <Sheet className="h-4 w-4" />
              <span className="hidden sm:inline">Export to Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
            <Button onClick={() => setEmailDialogOpen(true)} variant="outline" className="gap-2 w-full sm:w-auto">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email Report</span>
              <span className="sm:hidden">Email</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Preview ({filteredRisks.length} risks)</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskTable risks={filteredRisks} selectable={true} onUpdate={fetchData} />
        </CardContent>
      </Card>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>To (comma-separated emails)</Label>
              <Input
                placeholder="email@example.com, other@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This will send the current filtered report ({filteredRisks.length} risks) as an HTML table in the email body.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={sendReportEmail} disabled={sendingEmail} className="gap-2">
              <Mail className="h-4 w-4" />
              {sendingEmail ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;