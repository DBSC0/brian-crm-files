import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password, full_name, role, org_id } = await req.json();

    if (!email || !password || !org_id) {
      throw new Error("email, password y org_id son requeridos");
    }
    if (password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }
    if (role === "owner") {
      throw new Error("No se puede crear usuarios con rol propietario desde administración");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: corsHeaders,
      });
    }

    // Cliente con JWT del admin para verificar permisos
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const { data: hasPerm } = await userClient.rpc("has_permission", {
      p_org_id: org_id,
      p_user_id: caller.id,
      p_permission_key: "users.invite",
    });
    if (!hasPerm) {
      return new Response(JSON.stringify({ error: "Sin permiso: users.invite" }), {
        status: 403, headers: corsHeaders,
      });
    }

    // Cliente admin con service_role para crear el usuario sin email de invitación
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });
    if (createErr) throw createErr;

    await adminClient.from("profiles").insert({
      id: newUser.user.id,
      full_name: full_name || "",
      email,
      status: "active",
    });

    await adminClient.from("organization_members").insert({
      organization_id: org_id,
      user_id: newUser.user.id,
      role: role || "solo_lectura",
      status: "active",
      joined_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ user_id: newUser.user.id, email, full_name: full_name || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
