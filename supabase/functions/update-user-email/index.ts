import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, email, org_id } = await req.json();
    const nextEmail = String(email || "").trim().toLowerCase();

    if (!user_id || !nextEmail || !org_id) {
      throw new Error("user_id, email y org_id son requeridos");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      throw new Error("Ingresá un email válido");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "No autenticado" }, 401);

    const { data: hasPerm } = await userClient.rpc("has_permission", {
      p_org_id: org_id,
      p_user_id: caller.id,
      p_permission_key: "users.edit_permissions",
    });
    if (!hasPerm) return json({ error: "Sin permiso: users.edit_permissions" }, 403);

    const { data: memberCheck } = await userClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", org_id)
      .eq("user_id", user_id)
      .single();
    if (!memberCheck) {
      return json({ error: "El usuario no pertenece a esta organización" }, 403);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(user_id, {
      email: nextEmail,
      email_confirm: true,
    });
    if (updateAuthErr) throw updateAuthErr;

    const { error: profileErr } = await adminClient
      .from("profiles")
      .upsert({
        id: user_id,
        email: nextEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    if (profileErr) throw profileErr;

    return json({ ok: true, user_id, email: nextEmail });
  } catch (e) {
    return json({ error: e.message }, 400);
  }
});
