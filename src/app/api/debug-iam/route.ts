
import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) { /* No write needed for debug */ },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Not Authenticated" });
    }

    // 1. Direct Table Check
    const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role_id, roles(name)")
        .eq("user_id", user.id);

    // 2. RPC Check
    const { data: hasAdmin } = await supabase.rpc("has_permission", { required_perm: "admin.access" });
    const { data: hasCreate } = await supabase.rpc("has_permission", { required_perm: "pipelines.create" });

    // 3. Raw Permission Check
    // Let's manually join to see what's happening
    const { data: rawPermissions } = await supabase
        .from("user_roles")
        .select(`
      role_id,
      roles (
        name,
        role_permissions (
          permission_id,
          permissions (code)
        )
      )
    `)
        .eq("user_id", user.id);

    return NextResponse.json({
        user_id: user.id,
        user_roles: userRoles,
        check_admin: hasAdmin,
        check_create: hasCreate,
        raw_debug: rawPermissions
    });
}
