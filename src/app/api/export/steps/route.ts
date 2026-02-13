import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("journey_steps")
      .select(
        "id, journey_id, step_index, go_to, attempt_to, observe, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const header = [
      "id",
      "journey_id",
      "step_index",
      "go_to",
      "attempt_to",
      "observe",
      "created_at",
    ];

    const rows = (data ?? []).map((row: any) =>
      header
        .map((key) => {
          const value = row[key] ?? "";
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    );

    const csv = [header.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="week6_steps.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ??
          "Could not export steps. Check Supabase configuration.",
      },
      { status: 500 },
    );
  }
}

