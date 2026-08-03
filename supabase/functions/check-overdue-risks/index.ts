import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Checking for overdue risks...");

    // Get all risks that are overdue (target_completion_date < today AND status is "open" or "Overdue")
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueRisks, error: risksError } = await supabaseClient
      .from("risks")
      .select(`
        id,
        rap_number,
        risk_description,
        action_plan,
        risk_level,
        target_completion_date,
        priority_level,
        responsible_person,
        responsible_person_id,
        status,
        company_id,
        companies(name)
      `)
      .lt("target_completion_date", today)
      .neq("status", "closed")
      .neq("status", "completed");

    if (risksError) {
      console.error("Error fetching overdue risks:", risksError);
      throw risksError;
    }

    console.log(`Found ${overdueRisks?.length || 0} overdue risks`);

    if (!overdueRisks || overdueRisks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue risks found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to "Overdue" if not already
    for (const risk of overdueRisks) {
      if (risk.status !== "Overdue") {
        await supabaseClient
          .from("risks")
          .update({ status: "Overdue" })
          .eq("id", risk.id);
      }
    }

    // Send emails to responsible parties
    const emailPromises = overdueRisks.map(async (risk) => {
      if (!risk.responsible_person_id || risk.responsible_person_id.length === 0) {
        console.log(`No responsible persons for risk ${risk.rap_number}`);
        return null;
      }

      // Get emails for all responsible persons
      const { data: users, error: usersError } = await supabaseClient
        .from("users")
        .select("email, full_name")
        .in("id", risk.responsible_person_id);

      if (usersError || !users || users.length === 0) {
        console.error(`Error fetching users for risk ${risk.rap_number}:`, usersError);
        return null;
      }

      // Send email to each responsible person
      const emailResults = await Promise.all(
        users.map(async (user) => {
          try {
            const facilityName = (risk as any).companies?.name || "N/A";
            const emailResponse = await resend.emails.send({
              from: "Notifications <notify@lc.freedomhc.com>",
              to: [user.email],
              subject: `⚠️ Overdue Risk Alert: ${risk.rap_number} (${facilityName})`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">
                    ⚠️ Overdue Risk Alert
                  </h1>
                  
                  <p style="font-size: 16px; color: #555;">
                    Hello ${user.full_name},
                  </p>
                  
                  <p style="font-size: 16px; color: #555;">
                    The following risk assigned to you is now <strong style="color: #dc3545;">OVERDUE</strong>:
                  </p>
                  
                  <div style="background-color: #fff3cd; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
                    <h2 style="color: #dc3545; margin-top: 0;">Risk Details</h2>
                    
                    <p><strong>Facility:</strong> ${facilityName}</p>
                    <p><strong>RAP Number:</strong> ${risk.rap_number}</p>
                    <p><strong>Risk Level:</strong> ${risk.risk_level}</p>
                    <p><strong>Priority Level:</strong> ${risk.priority_level}</p>
                    <p><strong>Target Completion Date:</strong> ${new Date(risk.target_completion_date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">OVERDUE</span></p>
                    
                    <h3 style="color: #333; margin-top: 20px;">Risk Description:</h3>
                    <p style="white-space: pre-wrap;">${risk.risk_description}</p>
                    
                    <h3 style="color: #333; margin-top: 20px;">Action Plan:</h3>
                    <p style="white-space: pre-wrap;">${risk.action_plan}</p>
                  </div>
                  
                  <p style="font-size: 16px; color: #555;">
                    <strong>Action Required:</strong> Please log in to the Risk Management System immediately to address this overdue risk.
                  </p>
                  
                  <p style="font-size: 14px; color: #888; margin-top: 30px;">
                    This is an automated notification from the Risk Management System.
                  </p>
                </div>
              `,
            });

            console.log(`Email sent to ${user.email} for risk ${risk.rap_number}`);
            return { success: true, user: user.email, risk: risk.rap_number };
          } catch (error: any) {
            console.error(`Error sending email to ${user.email}:`, error);
            return { success: false, user: user.email, risk: risk.rap_number, error: error.message };
          }
        })
      );

      return emailResults;
    });

    const results = await Promise.all(emailPromises);
    const flatResults = results.flat().filter(r => r !== null);

    console.log("Email notifications completed:", flatResults);

    return new Response(
      JSON.stringify({ 
        message: "Overdue risk notifications processed",
        risksChecked: overdueRisks.length,
        emailsSent: flatResults.filter(r => r?.success).length,
        results: flatResults
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in check-overdue-risks function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
