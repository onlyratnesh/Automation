
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
}
