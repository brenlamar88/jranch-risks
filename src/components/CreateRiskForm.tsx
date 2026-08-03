import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";
import { useFacilityAccess } from "@/hooks/useFacilityAccess";

const VISIBILITY_OPTIONS = [
  { value: "facility_only", label: "Facility Only (default)" },
  { value: "corporate_only", label: "Corporate Only (hidden from facility)" },
  { value: "both", label: "Both Corporate & Facility" },
];


const PRIORITY_LEVELS = ["1", "2", "3", "Remaining"];

const SECTORS = ["REGULATORY/COMPLIANCE", "PATIENT CARE", "FINANCE"];

const RISK_ORIGINS = ["INTERNAL", "EXTERNAL"];

const PRIORITY_STATUS = [
  "URGENT & IMPORTANT",
  "IMPORTANT BUT NOT URGENT",
  "URGENT BUT NOT IMPORTANT",
  "NOT URGENT OR IMPORTANT",
];

const RISK_LEVELS = [
  { label: "LEVEL - 5 (24hrs)", value: "5", days: 1 },
  { label: "LEVEL - 4 (72hrs)", value: "4", days: 3 },
  { label: "LEVEL - 3 (7 Days)", value: "3", days: 7 },
  { label: "LEVEL - 2 (30 Days)", value: "2", days: 30 },
  { label: "LEVEL - 1 (90 Days)", value: "1", days: 90 },
];

const formSchema = z.object({
  department: z.string().min(1, "Department is required"),
  company: z.string().min(1, "Company is required"),
  service_line: z.string().min(1, "Service line is required"),
  focus_area: z.string().min(1, "Focus area is required"),
  priority_level: z.string().min(1, "Priority level is required"),
  priority_status: z.string().min(1, "Priority status is required"),
  risk_level: z.string().min(1, "Risk level is required"),
  responsible_person_ids: z.array(z.string()).min(1, "At least one responsible party is required"),
  risk_description: z.string().min(1, "Risk description is required"),
  action_plan: z.string().min(1, "Action plan is required"),
  completion_percentage: z.string(),
  success_indicators: z.string().optional(),
  ongoing_risk: z.boolean().optional(),
  sector: z.string().optional(),
  risk_origin: z.string().optional(),
  visibility: z.string().optional(),
});

const CreateRiskForm = () => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [serviceLines, setServiceLines] = useState<Array<{ id: string; name: string }>>([]);
  const [focusAreas, setFocusAreas] = useState<Array<{ id: string; name: string }>>([]);
  
  const [targetDate, setTargetDate] = useState<string>("");
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [userSearch, setUserSearch] = useState("");
  const { toast } = useToast();
  const { hasMultiFacilityAccess } = useFacilityAccess();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      department: "",
      company: "",
      service_line: "",
      focus_area: "",
      priority_level: "",
      priority_status: "",
      risk_level: "",
      responsible_person_ids: [],
      risk_description: "",
      action_plan: "",
      completion_percentage: "0",
      success_indicators: "",
      ongoing_risk: false,
      sector: "",
      risk_origin: "",
      visibility: "facility_only",
    },
  });

  useEffect(() => {
    const fetchData = async () => {

      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name")
        .order("full_name");
      
      const { data: deptsData } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      
      const { data: serviceLinesData } = await supabase
        .from("service_lines")
        .select("id, name")
        .order("name");
      
      const { data: focusAreasData } = await supabase
        .from("focus_areas")
        .select("id, name")
        .order("name");
      
      if (usersData) setUsers(usersData);
      if (deptsData) setDepartments(deptsData);
      if (companiesData) setCompanies(companiesData);
      if (serviceLinesData) setServiceLines(serviceLinesData);
      if (focusAreasData) setFocusAreas(focusAreasData);
    };

    fetchData();
  }, []);

  const watchRiskLevel = form.watch("risk_level");

  useEffect(() => {
    if (watchRiskLevel) {
      const riskLevel = RISK_LEVELS.find(r => r.value === watchRiskLevel);
      if (riskLevel) {
        const today = new Date();
        const target = new Date(today);
        target.setDate(target.getDate() + riskLevel.days);
        setTargetDate(target.toISOString().split('T')[0]);
        setDaysRemaining(riskLevel.days);
      }
    }
  }, [watchRiskLevel]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate RAP number (you may want to customize this logic)
      const rapNumber = `RAP-${Date.now()}`;

      // Get responsible persons' names
      const responsibleUsers = users.filter(u => values.responsible_person_ids.includes(u.id));
      const responsibleNames = responsibleUsers.map(u => u.full_name).join(", ");
      
      const { error } = await supabase.from("risks").insert({
        rap_number: rapNumber,
        department_id: values.department,
        company_id: values.company,
        service_line_id: values.service_line,
        focus_area_id: values.focus_area,
        priority_level: values.priority_level,
        priority_status: values.priority_status,
        risk_level: values.risk_level,
        responsible_person: responsibleNames,
        responsible_person_id: values.responsible_person_ids,
        risk_description: values.risk_description,
        action_plan: values.action_plan,
        root_cause: values.success_indicators || "",
        date_identified: new Date().toISOString().split('T')[0],
        target_completion_date: targetDate,
        status: "open",
        created_by: user.id,
        completion_percentage: parseInt(values.completion_percentage) || 0,
        ongoing_risk: values.ongoing_risk || false,
        sector: values.sector || null,
        risk_origin: values.risk_origin || null,
        visibility: hasMultiFacilityAccess ? (values.visibility || "facility_only") : "facility_only",
      } as any);

      if (error) throw error;

      // Send email notifications to all responsible persons
      for (const responsibleUser of responsibleUsers) {
        try {
          await supabase.functions.invoke("send-risk-notification", {
            body: {
              responsiblePerson: responsibleUser.full_name,
              riskDetails: {
                rap_number: rapNumber,
                risk_description: values.risk_description,
                action_plan: values.action_plan,
                risk_level: values.risk_level,
                target_completion_date: targetDate,
                priority_level: values.priority_level,
                company_id: values.company,
              },
            },
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Don't fail the entire operation if email fails
        }
      }

      toast({
        title: "Success",
        description: "Risk created successfully",
      });

      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Risk
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Risk</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[...departments].sort((a,b)=>a.name.localeCompare(b.name)).map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hasMultiFacilityAccess && (
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "facility_only"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VISIBILITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="service_line"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Line</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service line" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceLines.map((line) => (
                          <SelectItem key={line.id} value={line.id}>
                            {line.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="focus_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Focus Area</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select focus area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {focusAreas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_STATUS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="risk_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RISK_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsible_person_ids"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Responsible Parties (Select multiple)</FormLabel>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    {field.value?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {field.value.map((id: string) => {
                          const u = users.find(u => u.id === id);
                          return u ? (
                            <span key={id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                              {u.full_name}
                              <button type="button" onClick={() => field.onChange(field.value.filter((v: string) => v !== id))} className="hover:text-destructive">×</button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                      {users.filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase())).map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`user-${user.id}`}
                            checked={field.value?.includes(user.id)}
                            onChange={(e) => {
                              const currentValue = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentValue, user.id]);
                              } else {
                                field.onChange(currentValue.filter((id: string) => id !== user.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer">
                            {user.full_name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SECTORS.map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="risk_origin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Origin</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk origin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RISK_ORIGINS.map((origin) => (
                          <SelectItem key={origin} value={origin}>
                            {origin}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="completion_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentage of Completion</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select percentage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => i * 10).map((percent) => (
                          <SelectItem key={percent} value={percent.toString()}>
                            {percent}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Target Date of Completion</FormLabel>
                <Input value={targetDate} readOnly className="bg-muted" />
              </div>

              <div className="space-y-2">
                <FormLabel>Days Remaining to Complete</FormLabel>
                <Input value={daysRemaining} readOnly className="bg-muted" />
              </div>
            </div>

            <FormField
              control={form.control}
              name="risk_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Detail or Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className="uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="action_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actions Taken to Mitigate Risks/Strategy</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="success_indicators"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Success/Completion Indicators</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ongoing_risk"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        id="ongoing_risk_create"
                        checked={field.value || false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                    <FormLabel htmlFor="ongoing_risk_create" className="cursor-pointer font-normal">
                      Ongoing Risk
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">Create Risk</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRiskForm;
