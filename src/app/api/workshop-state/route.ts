import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("workshop_state")
      .select("current_phase")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const phase = (data?.current_phase as string) ?? "1";
    return NextResponse.json({ phase });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[workshop-state GET]", message);
    return NextResponse.json({ phase: "1" });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const phase = body?.phase as string;
    if (!["1", "2_categories", "2_story", "3"].includes(phase)) {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const { data: row } = await supabase
      .from("workshop_state")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (row?.id) {
      await supabase
        .from("workshop_state")
        .update({ current_phase: phase, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    } else {
      await supabase.from("workshop_state").insert({ current_phase: phase });
    }
    return NextResponse.json({ phase });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Failed to update phase" }, { status: 500 });
  }
}
