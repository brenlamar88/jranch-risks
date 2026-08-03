import { format } from "date-fns";

interface Risk {
  id: string;
  rap_number: string;
  risk_description: string;
  risk_level: string;
  status: string;
  target_completion_date: string;
  responsible_person: string;
  departments?: { name: string };
  action_plan?: string;
  root_cause?: string;
  date_identified?: string;
  priority_level?: string;
  priority_status?: string;
  completion_percentage?: number;
  actual_completion_date?: string;
}

interface PrintRisksViewProps {
  risks: Risk[];
}

const getRiskLevelLabel = (level: string) => {
  switch (level) {
    case "5": return "Level 5 - Critical (24hrs)";
    case "4": return "Level 4 - High (72hrs)";
    case "3": return "Level 3 - Medium (7 Days)";
    case "2": return "Level 2 - Low (30 Days)";
    case "1": return "Level 1 - Minimal (90 Days)";
    default: return `Level ${level}`;
  }
};

const getStatusLabel = (status: string) => {
  return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
};

const PrintRisksView = ({ risks }: PrintRisksViewProps) => {
  return (
    <div className="print-container p-8 bg-white text-black">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .risk-item {
              page-break-inside: avoid;
            }
            @page {
              margin: 1cm;
            }
          }
        `}
      </style>
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Risk Management Report</h1>
        <p className="text-sm text-gray-600">Generated: {format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}</p>
        <p className="text-sm text-gray-600">{risks.length} risk(s) selected</p>
      </div>

      {risks.map((risk, index) => (
        <div key={risk.id} className="risk-item mb-8 border border-gray-300 rounded-lg p-6">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{risk.rap_number}</h2>
                <p className="text-sm text-gray-500">Risk {index + 1} of {risks.length}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  risk.status === 'completed' ? 'bg-green-100 text-green-800' :
                  risk.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  risk.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusLabel(risk.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Department</p>
              <p className="text-sm">{risk.departments?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Risk Level</p>
              <p className="text-sm">{getRiskLevelLabel(risk.risk_level)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Responsible Person</p>
              <p className="text-sm">{risk.responsible_person}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Priority Status</p>
              <p className="text-sm">{risk.priority_status || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Date Identified</p>
              <p className="text-sm">{risk.date_identified ? format(new Date(risk.date_identified), "MMM dd, yyyy") : "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Target Completion Date</p>
              <p className="text-sm">{format(new Date(risk.target_completion_date), "MMM dd, yyyy")}</p>
            </div>
            {risk.actual_completion_date && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Actual Completion Date</p>
                <p className="text-sm">{format(new Date(risk.actual_completion_date), "MMM dd, yyyy")}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Completion Percentage</p>
              <p className="text-sm">{risk.completion_percentage || 0}%</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Risk Description</p>
              <p className="text-sm bg-gray-50 p-3 rounded uppercase">{risk.risk_description}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Actions Taken to Mitigate Risks / Strategy</p>
              <p className="text-sm bg-gray-50 p-3 rounded">{risk.action_plan || "N/A"}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Success / Completion Indicators</p>
              <p className="text-sm bg-gray-50 p-3 rounded">{risk.root_cause || "N/A"}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintRisksView;
