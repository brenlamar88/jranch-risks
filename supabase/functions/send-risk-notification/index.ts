import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RiskNotificationRequest {
  responsiblePerson: string;
  riskDetails: {
    rap_number: string;
    risk_description: string;
    action_plan: string;
    risk_level: string;
    target_completion_date: string;
    priority_level: string;
    company_id?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { responsiblePerson, riskDetails }: RiskNotificationRequest = await req.json();

    console.log("Sending notification to:", responsiblePerson);

    // Get the user's email from their full name
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("email")
      .eq("full_name", responsiblePerson)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user email:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.email;
    console.log("Sending email to:", userEmail);

    // Look up facility name
    let facilityName = "N/A";
    if (riskDetails.company_id) {
      const { data: companyData } = await supabaseClient
        .from("companies")
        .select("name")
        .eq("id", riskDetails.company_id)
        .maybeSingle();
      if (companyData?.name) facilityName = companyData.name;
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Notifications <notify@lc.freedomhc.com>",
      to: [userEmail],
      subject: `New Risk Assigned: ${riskDetails.rap_number} (${facilityName})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Risk Assignment Notification
          </h1>
          
          <p style="font-size: 16px; color: #555;">
            Hello ${responsiblePerson},
          </p>
          
          <p style="font-size: 16px; color: #555;">
            You have been assigned as the responsible party for the following risk:
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #007bff; margin-top: 0;">Risk Details</h2>
            
            <p><strong>Facility:</strong> ${facilityName}</p>
            <p><strong>RAP Number:</strong> ${riskDetails.rap_number}</p>
            <p><strong>Risk Level:</strong> ${riskDetails.risk_level}</p>
            <p><strong>Priority Level:</strong> ${riskDetails.priority_level}</p>
            <p><strong>Target Completion Date:</strong> ${new Date(riskDetails.target_completion_date).toLocaleDateString()}</p>
            
            <h3 style="color: #333; margin-top: 20px;">Risk Description:</h3>
            <p style="white-space: pre-wrap;">${riskDetails.risk_description}</p>
            
            <h3 style="color: #333; margin-top: 20px;">Action Plan:</h3>
            <p style="white-space: pre-wrap;">${riskDetails.action_plan}</p>
          </div>
          
          <p style="font-size: 16px; color: #555;">
            Please log in to the Risk Management System to review and take action on this risk.
          </p>
          
          <p style="font-size: 14px; color: #888; margin-top: 30px;">
            This is an automated notification from the Risk Management System.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
