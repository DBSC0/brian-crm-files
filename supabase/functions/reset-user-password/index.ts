import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, new_password, org_id } = await req.json();

    if (!user_id || !new_password || !org_id) {
      throw new Error("user_id, new_password y org_id son requeridos");
    }
    if (new_password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: corsHeaders,
      });
    }

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

    // Verificar permiso
    const { data: hasPerm } = await userClient.rpc("has_permission", {
      p_org_id: org_id,
      p_user_id: caller.id,
      p_permission_key: "users.edit_permissions",
    });
    if (!hasPerm) {
      return new Response(JSON.stringify({ error: "Sin permiso: users.edit_permissions" }), {
        status: 403, headers: corsHeaders,
      });
    }

    // Verificar que el target user pertenece a la org
    const { data: memberCheck } = await userClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", org_id)
      .eq("user_id", user_id)
      .single();
    if (!memberCheck) {
      return new Response(JSON.stringify({ error: "El usuario no pertenece a esta organización" }), {
        status: 403, headers: corsHeaders,
      });
    }

    // No permitir resetear la propia contraseña por esta vía (usar perfil propio)
    if (caller.id === user_id) {
      return new Response(JSON.stringify({ error: "Usá tu perfil para cambiar tu propia contraseña" }), {
        status: 400, headers: corsHeaders,
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });
    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
