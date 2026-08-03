import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Risk {
  id: string;
  risk_level: string;
  company_id?: string;
  companies?: { name: string };
}

interface HighRiskByFacilityChartProps {
  risks: Risk[];
  onFacilityClick?: (facilityId: string, facilityName: string) => void;
}

const LEVEL5_COLOR = "#dc2626";
const LEVEL4_COLOR = "#ea580c";

const HighRiskByFacilityChart = ({ risks, onFacilityClick }: HighRiskByFacilityChartProps) => {
  const highRisks = risks.filter((r) => r.risk_level === "5" || r.risk_level === "4");

  const facilityMap = highRisks.reduce((acc, r) => {
    const name = r.companies?.name || "Unknown";
    const id = r.company_id || "unknown";
    if (!acc[name]) acc[name] = { facility: name, id, level5: 0, level4: 0, total: 0 };
    if (r.risk_level === "5") acc[name].level5 += 1;
    else if (r.risk_level === "4") acc[name].level4 += 1;
    acc[name].total += 1;
    return acc;
  }, {} as Record<string, { facility: string; id: string; level5: number; level4: number; total: number }>);

  const data = Object.values(facilityMap).sort((a, b) => b.total - a.total);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Level 4 & 5 Risks by Facility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No Level 4 or 5 risks found
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(300, data.length * 40 + 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Level 4 & 5 Risks by Facility</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="facility" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="level5" stackId="a" fill={LEVEL5_COLOR} name="Level 5" />
                <Bar dataKey="level4" stackId="a" fill={LEVEL4_COLOR} name="Level 4" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LEVEL5_COLOR }} />
                      L5
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LEVEL4_COLOR }} />
                      L4
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow
                    key={row.facility}
                    className={onFacilityClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                    onClick={() => onFacilityClick?.(row.id, row.facility)}
                  >
                    <TableCell className="font-medium">{row.facility}</TableCell>
                    <TableCell className="text-right">{row.level5}</TableCell>
                    <TableCell className="text-right">{row.level4}</TableCell>
                    <TableCell className="text-right font-semibold">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HighRiskByFacilityChart;
