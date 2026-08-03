import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface User {
  full_name: string
  email: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const users: User[] = [
      { full_name: 'ACCESS SERENITY', email: 'accessserenity@freedomhc.com' },
      { full_name: 'BRENNAN', email: 'broberts@freedomhc.com' },
      { full_name: 'BRYAN', email: 'bcoyle@freedomhc.com' },
      { full_name: 'BRYCE', email: 'breed@freedomhc.com' },
      { full_name: 'CYLYCE', email: 'creed@marvelrcs.com' },
      { full_name: 'DANIELLE', email: 'dalexandrenko@freedomhc.com' },
      { full_name: 'JOSEPH', email: 'jthibeaux@freedomhc.com' },
      { full_name: 'JASON (NICOLE)', email: 'jreed@freedomhc.com' },
      { full_name: 'KATIE', email: 'kadams@freedomhc.com' },
      { full_name: 'SARAH', email: 'schisholm@freedomhc.com' },
      { full_name: 'SPARKY', email: 'swaters@freedomhc.com' },
      { full_name: 'STEVE', email: 'slea@freedomhc.com' },
      { full_name: 'TRISH', email: 'ttemple@freedomhc.com' },
    ]

    const results = []
    const temporaryPassword = 'FreedomRAP2024!' // Users should change this on first login

    for (const user of users) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name
        }
      })

      if (error) {
        results.push({ email: user.email, status: 'error', message: error.message })
      } else {
        results.push({ email: user.email, status: 'success', user_id: data.user?.id })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
