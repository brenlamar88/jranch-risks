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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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

const STATUS_OPTIONS = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Overdue", value: "overdue" },
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
  status: z.string().min(1, "Status is required"),
  ongoing_risk: z.boolean().optional(),
  sector: z.string().optional(),
  risk_origin: z.string().optional(),
  visibility: z.string().optional(),
});

interface EditRiskFormProps {
  risk: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditRiskForm = ({ risk, open, onOpenChange, onSuccess }: EditRiskFormProps) => {
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [serviceLines, setServiceLines] = useState<Array<{ id: string; name: string }>>([]);
  const [focusAreas, setFocusAreas] = useState<Array<{ id: string; name: string }>>([]);
  const [targetDate, setTargetDate] = useState<string>("");
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const { toast } = useToast();
  const { hasMultiFacilityAccess } = useFacilityAccess();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      department: risk?.department_id || "",
      company: risk?.company_id || "",
      service_line: risk?.service_line_id || "",
      focus_area: risk?.focus_area_id || "",
      priority_level: risk?.priority_level || "",
      priority_status: risk?.priority_status || "",
      risk_level: risk?.risk_level || "",
      responsible_person_ids: Array.isArray(risk?.responsible_person_id) ? risk.responsible_person_id : (risk?.responsible_person_id ? [risk.responsible_person_id] : []),
      risk_description: risk?.risk_description || "",
      action_plan: risk?.action_plan || "",
      completion_percentage: (risk?.completion_percentage !== null && risk?.completion_percentage !== undefined) 
        ? risk.completion_percentage.toString() 
        : "0",
      success_indicators: risk?.root_cause || "",
      status: risk?.status || "open",
      ongoing_risk: risk?.ongoing_risk || false,
      sector: risk?.sector || "",
      risk_origin: (risk as any)?.risk_origin || "",
      visibility: (risk as any)?.visibility || "facility_only",
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

  useEffect(() => {
    if (risk) {
      // Force reset form with latest risk data whenever risk object changes
      const completionValue = risk.completion_percentage !== null && risk.completion_percentage !== undefined 
        ? risk.completion_percentage.toString() 
        : "0";
      
      form.reset({
        department: risk.department_id || "",
        company: risk.company_id || "",
        service_line: risk.service_line_id || "",
        focus_area: risk.focus_area_id || "",
        priority_level: risk.priority_level || "",
        priority_status: risk.priority_status || "",
        risk_level: risk.risk_level || "",
        responsible_person_ids: Array.isArray(risk.responsible_person_id) ? risk.responsible_person_id : (risk.responsible_person_id ? [risk.responsible_person_id] : []),
        risk_description: risk.risk_description || "",
        action_plan: risk.action_plan || "",
        completion_percentage: completionValue,
        success_indicators: risk.root_cause || "",
        status: risk.status || "open",
        ongoing_risk: risk.ongoing_risk || false,
        sector: risk.sector || "",
        risk_origin: (risk as any)?.risk_origin || "",
        visibility: (risk as any)?.visibility || "facility_only",
      });
      
      if (risk.target_completion_date) {
        setTargetDate(risk.target_completion_date);
        const today = new Date();
        const target = new Date(risk.target_completion_date);
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(Math.max(0, diffDays));
      }
    }
  }, [risk?.id, risk?.completion_percentage, form]);

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
      // Get old and new responsible person IDs
      const oldIds = Array.isArray(risk.responsible_person_id) ? risk.responsible_person_id : (risk.responsible_person_id ? [risk.responsible_person_id] : []);
      const newIds = values.responsible_person_ids;
      
      // Find newly added responsible persons
      const addedIds = newIds.filter(id => !oldIds.includes(id));
      
      // Get responsible persons' names
      const responsibleUsers = users.filter(u => newIds.includes(u.id));
      const responsibleNames = responsibleUsers.map(u => u.full_name).join(", ");

      // Parse completion percentage - ensure it's a valid number
      const completionPercentageValue = parseInt(values.completion_percentage, 10);
      const completionPercentage = isNaN(completionPercentageValue) ? 0 : completionPercentageValue;
      
      console.log("Updating risk with completion_percentage:", completionPercentage, "from form value:", values.completion_percentage);

      const updateData = {
        department_id: values.department,
        company_id: values.company,
        service_line_id: values.service_line,
        focus_area_id: values.focus_area,
        priority_level: values.priority_level,
        priority_status: values.priority_status,
        risk_level: values.risk_level,
        responsible_person: responsibleNames,
        responsible_person_id: newIds,
        risk_description: values.risk_description,
        action_plan: values.action_plan,
        root_cause: values.success_indicators || "",
        target_completion_date: targetDate,
        status: values.status,
        updated_at: new Date().toISOString(),
        completion_percentage: completionPercentage,
        ongoing_risk: values.ongoing_risk || false,
        sector: values.sector || null,
        risk_origin: values.risk_origin || null,
        ...(hasMultiFacilityAccess ? { visibility: values.visibility || "facility_only" } : {}),
      } as any;

      console.log("Full update data:", updateData);

      const { error, data } = await supabase
        .from("risks")
        .update(updateData)
        .eq("id", risk.id)
        .select();

      console.log("Update response:", { error, data });

      if (error) throw error;

      // Send email notifications to newly added responsible persons
      const newlyAddedUsers = users.filter(u => addedIds.includes(u.id));
      for (const responsibleUser of newlyAddedUsers) {
        try {
          await supabase.functions.invoke("send-risk-notification", {
            body: {
              responsiblePerson: responsibleUser.full_name,
              riskDetails: {
                rap_number: risk.rap_number,
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
        description: "Risk updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit Risk - {risk?.rap_number}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log("Form validation errors:", errors);
          })} className="space-y-4">
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                    <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-user-${user.id}`}
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
                          <label htmlFor={`edit-user-${user.id}`} className="text-sm cursor-pointer">
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
                    <Select 
                      onValueChange={(value) => {
                        console.log("Completion percentage changed to:", value);
                        field.onChange(value);
                      }} 
                      value={field.value}
                    >
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
                        id="ongoing_risk_edit"
                        checked={field.value || false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                    <FormLabel htmlFor="ongoing_risk_edit" className="cursor-pointer font-normal">
                      Ongoing Risk
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">Update Risk</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRiskForm;
