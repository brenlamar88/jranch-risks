import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Risk {
  id: string;
  risk_level: string;
  department_id?: string;
  departments?: { name: string };
}

interface RiskLevelsByDepartmentChartProps {
  risks: Risk[];
  onDepartmentClick?: (departmentId: string, departmentName: string) => void;
}

const RISK_COLORS = {
  "5": "#dc2626", // red-600 - Critical
  "4": "#ea580c", // orange-600 - High
  "3": "#f59e0b", // amber-500 - Medium
  "2": "#eab308", // yellow-500 - Low
  "1": "#84cc16", // lime-500 - Minimal
};

const RISK_LABELS = {
  "5": "Level 5",
  "4": "Level 4",
  "3": "Level 3",
  "2": "Level 2",
  "1": "Level 1",
};

const RiskLevelsByDepartmentChart = ({ risks, onDepartmentClick }: RiskLevelsByDepartmentChartProps) => {
  // Aggregate risks by level
  const riskLevelCounts = risks.reduce((acc, risk) => {
    const level = risk.risk_level;
    if (level) {
      acc[level] = (acc[level] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Aggregate risks by department with id
  const departmentCounts = risks.reduce((acc, risk) => {
    const deptName = risk.departments?.name || "Unknown";
    const deptId = risk.department_id || "unknown";
    if (!acc[deptName]) {
      acc[deptName] = { count: 0, id: deptId };
    }
    acc[deptName].count += 1;
    return acc;
  }, {} as Record<string, { count: number; id: string }>);

  // Convert to chart data format
  const chartData = Object.entries(riskLevelCounts)
    .map(([level, count]) => ({
      name: RISK_LABELS[level as keyof typeof RISK_LABELS] || `Level ${level}`,
      value: count,
      level: level,
    }))
    .sort((a, b) => parseInt(b.level) - parseInt(a.level));

  // Convert department data to array and sort by count
  const departmentData = Object.entries(departmentCounts)
    .map(([name, data]) => ({ name, count: data.count, id: data.id }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Levels Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No risk data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Risk Levels Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent, x, y }) => (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="600">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  )}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell 
                      key={`cell-${entry.level}`} 
                      fill={RISK_COLORS[entry.level as keyof typeof RISK_COLORS] || "#8884d8"} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} risks`, 'Count']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-4">Risks by Department</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Number of Risks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentData.map((dept) => (
                  <TableRow 
                    key={dept.name}
                    className={onDepartmentClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                    onClick={() => onDepartmentClick?.(dept.id, dept.name)}
                  >
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-right">{dept.count}</TableCell>
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

export default RiskLevelsByDepartmentChart;
