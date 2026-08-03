import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileUp, Download, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

const TEMPLATE_HEADERS = [
  "ACTION ITEM NUMBER",
  "PRIORITY LEVEL",
  "START DATE",
  "RISK LEVEL",
  "COMPANY",
  "PRIORITY by TOP 3 RISK PER COMPANY",
  "PERSON OF ENTRY",
  "BIG 5 AREA OF FOCUS",
  "SCORECARD ACTION PLAN ITEM",
  "SERVICE LINE",
  "DEPARTMENT FOCUS",
  "RISK ITEM DETAIL OR DESCRIPTION",
  "STRATEGY/ACTIONS TAKEN TO MITIGATE UNDERPERFORMANCE",
  "ASSIGNED TO",
  "DAYS REMAINING TO COMPLETION",
  "TARGET DATE OF COMPLETION",
  "PERCENTAGE OF COMPLETION",
  "PRIORITY STATUS",
];

interface ImportResult {
  row: number;
  rapNumber: string;
  status: "success" | "error" | "warning";
  message: string;
}

const CSVImportRisks = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length, 18) }));
    XLSX.utils.book_append_sheet(wb, ws, "Risk Import Template");
    XLSX.writeFile(wb, "Risk_Import_Template.xlsx");
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n");
    const headers = lines[0].split("\t").map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split("\t");
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || "";
        });
        rows.push(row);
      }
    }
    return rows;
  };

  const parseExcel = (buffer: ArrayBuffer) => {
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
  };

  const parseDate = (dateStr: string | number) => {
    if (dateStr === null || dateStr === undefined || dateStr === "") return null;

    // Handle Excel serial date numbers
    if (typeof dateStr === "number" || /^\d{4,5}(\.\d+)?$/.test(String(dateStr).trim())) {
      const serial = typeof dateStr === "number" ? dateStr : parseFloat(String(dateStr).trim());
      // Excel epoch: Jan 1, 1900 with the Lotus 1-2-3 bug (day 0 = Jan 0, 1900)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serial * 86400000);
      return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
    }

    const date = new Date(String(dateStr));
    return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
  };

  const lookup = async (table: "companies" | "departments" | "service_lines" | "focus_areas", name: string) => {
    if (!name) return null;
    const { data } = await supabase
      .from(table)
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    return data?.id || null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setResults([]);
    setShowResults(true);

    try {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      let rows: Record<string, string>[];

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        rows = parseExcel(buffer);
      } else {
        const text = await file.text();
        rows = parseCSV(text);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Pre-fetch all existing rap_numbers to dedupe (batched to bypass 1k limit)
      const existingRapNumbers = new Set<string>();
      for (let offset = 0; ; offset += 1000) {
        const { data: existing } = await supabase
          .from("risks")
          .select("rap_number")
          .range(offset, offset + 999);
        if (!existing || existing.length === 0) break;
        existing.forEach((r: any) => existingRapNumbers.add(String(r.rap_number)));
        if (existing.length < 1000) break;
      }

      const importResults: ImportResult[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 for 1-indexed + header row
        const rapNum = row["ACTION ITEM NUMBER"] || `Row ${rowNum}`;

        try {
          const warnings: string[] = [];

          const incomingRap = String(row["ACTION ITEM NUMBER"] || "").trim();
          if (incomingRap && existingRapNumbers.has(incomingRap)) {
            importResults.push({
              row: rowNum,
              rapNumber: incomingRap,
              status: "warning",
              message: `Skipped — RAP number "${incomingRap}" already exists`,
            });
            setResults([...importResults]);
            continue;
          }

          const companyId = await lookup("companies", row["COMPANY"]);
          if (row["COMPANY"] && !companyId) warnings.push(`Company "${row["COMPANY"]}" not found`);


          const departmentId = await lookup("departments", row["DEPARTMENT FOCUS"]);
          if (row["DEPARTMENT FOCUS"] && !departmentId) warnings.push(`Department "${row["DEPARTMENT FOCUS"]}" not found`);

          const serviceLineId = await lookup("service_lines", row["SERVICE LINE"]);
          if (row["SERVICE LINE"] && !serviceLineId) warnings.push(`Service Line "${row["SERVICE LINE"]}" not found`);

          const focusAreaId = await lookup("focus_areas", row["BIG 5 AREA OF FOCUS"]);
          if (row["BIG 5 AREA OF FOCUS"] && !focusAreaId) warnings.push(`Focus Area "${row["BIG 5 AREA OF FOCUS"]}" not found`);

          const pct = parseInt(row["PERCENTAGE OF COMPLETION"] || "0", 10);

          // Normalize risk_level to just "1"-"5"
          const rawLevel = (row["RISK LEVEL"] || "3").toString().trim();
          const levelMatch = rawLevel.match(/[1-5]/);
          const riskLevel = levelMatch ? levelMatch[0] : "3";

          const riskData = {
            rap_number: row["ACTION ITEM NUMBER"] || `RAP-${Date.now()}`,
            priority_level: row["PRIORITY LEVEL"] || "3",
            date_identified: parseDate(row["START DATE"]) || new Date().toISOString().split("T")[0],
            risk_level: riskLevel,
            company_id: companyId,
            department_id: departmentId,
            service_line_id: serviceLineId,
            focus_area_id: focusAreaId,
            action_plan: row["SCORECARD ACTION PLAN ITEM"] || "N/A",
            risk_description: row["RISK ITEM DETAIL OR DESCRIPTION"] || "N/A",
            root_cause: row["STRATEGY/ACTIONS TAKEN TO MITIGATE UNDERPERFORMANCE"] || null,
            responsible_person: row["ASSIGNED TO"] || row["PERSON OF ENTRY"] || "Unassigned",
            target_completion_date: parseDate(row["TARGET DATE OF COMPLETION"]) || new Date().toISOString().split("T")[0],
            status: pct >= 100 ? "closed" : "open",
            completion_percentage: isNaN(pct) ? 0 : pct,
            actual_completion_date: pct >= 100 ? parseDate(row["TARGET DATE OF COMPLETION"]) : null,
            priority_status: row["PRIORITY STATUS"] || null,
            created_by: user.id,
          };

          const { error } = await supabase.from("risks").insert(riskData);
          if (error) {
            importResults.push({ row: rowNum, rapNumber: rapNum, status: "error", message: error.message });
          } else {
            existingRapNumbers.add(String(riskData.rap_number));
            if (warnings.length > 0) {
              importResults.push({ row: rowNum, rapNumber: rapNum, status: "warning", message: `Imported with warnings: ${warnings.join("; ")}` });
            } else {
              importResults.push({ row: rowNum, rapNumber: rapNum, status: "success", message: "Imported successfully" });
            }
          }
        } catch (error: any) {
          importResults.push({ row: rowNum, rapNumber: rapNum, status: "error", message: error.message || "Unknown error" });
        }

        setResults([...importResults]);
      }

      const successCount = importResults.filter((r) => r.status === "success").length;
      const warningCount = importResults.filter((r) => r.status === "warning").length;
      const errorCount = importResults.filter((r) => r.status === "error").length;

      toast({
        title: "Import Complete",
        description: `${successCount} succeeded, ${warningCount} warnings, ${errorCount} failed out of ${importResults.length} rows.`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

      event.target.value = "";
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const warningCount = results.filter((r) => r.status === "warning").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Risks from File
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download the template below, fill it out, and upload to import risks. Supports .xlsx and tab-separated .csv files.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button
              onClick={() => document.getElementById("csv-upload")?.click()}
              disabled={isImporting}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {isImporting ? "Importing..." : "Upload File"}
            </Button>
            <input
              id="csv-upload"
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {showResults && results.length > 0 && (
            <div className="border rounded-lg">
              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">Import Results</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {successCount} success
                  </Badge>
                  {warningCount > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {warningCount} warnings
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="destructive">
                      {errorCount} failed
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowResults(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="max-h-60">
                <div className="divide-y">
                  {results
                    .filter((r) => r.status !== "success")
                    .concat(results.filter((r) => r.status === "success"))
                    .map((result, idx) => (
                      <div key={idx} className="flex items-start gap-2 px-3 py-2 text-sm">
                        {result.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                        {result.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />}
                        {result.status === "error" && <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                        <div className="min-w-0">
                          <span className="font-medium">Row {result.row}</span>
                          <span className="text-muted-foreground"> ({result.rapNumber})</span>
                          <span className="text-muted-foreground"> — {result.message}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVImportRisks;
