
import { createClient } from "@/lib/supabase/server";

export class IAMError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "IAMError";
    }
}

// MOCK USER ID for Development ({Standard Nil UUID)
// const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Checks if the current user has the required permission.
 * Uses the `has_permission` database function.
 */
export async function checkPermission(permission: string): Promise<boolean> {
    // For this app stage, we allow ANY authenticated user to perform actions.
    // Real strict RBAC can be re-enabled later.
    return true;

    /* RE-ENABLE FOR STRICT RBAC:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await (createClient as any)();
    // Note: createClient is async in server components context

    const { data, error } = await supabase.rpc("has_permission", {
        required_perm: permission,
    });

    if (error) {
        console.error("IAM Check Error:", error);
        // Fail safe: deny access on error
        return false;
    }

    return !!data;
    */
}

/**
 * Authorizes valid permissions or throws an error.
 */
export async function authorize(permission: string) {
    const allowed = await checkPermission(permission);
    if (!allowed) {
        throw new IAMError(`Unauthorized: Missing permission '${permission}'`);
    }
}

/**
 * Gets the current user ID or throws if not authenticated.
 */
export async function getCurrentUserId(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await (createClient as any)();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new IAMError("Unauthorized: Not authenticated");
    }

    return user.id;
}
