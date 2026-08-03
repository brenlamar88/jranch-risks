const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, risks, filters } = await req.json();

    if (!to || !Array.isArray(to) || to.length === 0) {
      return new Response(JSON.stringify({ error: "At least one recipient email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!risks || !Array.isArray(risks)) {
      return new Response(JSON.stringify({ error: "Risks data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filterSummary = filters && filters.length > 0 ? filters.join(" | ") : "None";

    const tableRows = risks
      .map(
        (r: any) => `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px;font-size:12px;">${r.company_name || "N/A"}</td>
          <td style="padding:8px;font-size:12px;">${r.department_name || "N/A"}</td>
          <td style="padding:8px;font-size:12px;">Level ${r.risk_level}</td>
          <td style="padding:8px;font-size:12px;">${r.risk_description || ""}</td>
          <td style="padding:8px;font-size:12px;">${r.action_plan || ""}</td>
          <td style="padding:8px;font-size:12px;">${r.root_cause || ""}</td>
          <td style="padding:8px;font-size:12px;">${r.status || ""}</td>
          <td style="padding:8px;font-size:12px;">${r.responsible_person || ""}</td>
          <td style="padding:8px;font-size:12px;">${r.date_identified || ""}</td>
          <td style="padding:8px;font-size:12px;">${r.target_completion_date || ""}</td>
          <td style="padding:8px;font-size:12px;">${r.rap_number || ""}</td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:100%;padding:20px;">
        <h1 style="color:#1e40af;font-size:22px;">Risk Management Report</h1>
        <p style="color:#6b7280;font-size:13px;">Generated: ${new Date().toLocaleDateString()}</p>
        <p style="color:#6b7280;font-size:13px;">Filters: ${filterSummary}</p>
        <p style="color:#6b7280;font-size:13px;">Total Risks: ${risks.length}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background-color:#3b82f6;color:white;">
              <th style="padding:8px;font-size:11px;text-align:left;">Company</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Department</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Level</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Risk Description</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Actions/Strategy</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Success Indicators</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Status</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Responsible</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Identified</th>
              <th style="padding:8px;font-size:11px;text-align:left;">Target Date</th>
              <th style="padding:8px;font-size:11px;text-align:left;">RAP #</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "FreedomRAP <notify@lc.freedomhc.com>",
        to,
        subject: subject || "Risk Management Report",
        html,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: resData }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
