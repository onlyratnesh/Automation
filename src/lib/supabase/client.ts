
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    // Use the actual anon key (JWT format) - PUBLISHABLE_KEY is not a valid Supabase key
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}
