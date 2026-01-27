import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function InstrumentsData() {
    const supabase = await createClient();
    const { data: instruments, error } = await supabase.from("instruments").select();
    return <pre>{JSON.stringify({ instruments, error }, null, 2)}</pre>;
}

export default function Instruments() {
    return (
        <Suspense fallback={<div>Loading instruments...</div>}>
            <InstrumentsData />
        </Suspense>
    );
}
