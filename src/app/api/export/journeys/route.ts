import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("journeys")
      .select(
        "id, journey_code, group_id, mode, campus_or_system, user_focus, journey_goal, claimed_access_statement, claimed_statement_id, what_happened, expected_outcome, barrier_type, where_happened, access_result, missing_or_unclear, suggested_improvement, status, issue_scope, created_at, claimed_access_statements(source_url, user_focus)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const header = [
      "id",
      "journey_code",
      "group_id",
      "mode",
      "campus_or_system",
      "user_focus",
      "journey_goal",
      "claimed_access_statement",
      "claimed_statement_id",
      "claim_source_url",
      "claim_user_focus",
      "what_happened",
      "expected_outcome",
      "barrier_type",
      "where_happened",
      "access_result",
      "missing_or_unclear",
      "suggested_improvement",
      "status",
      "issue_scope",
      "created_at",
    ];

    const rows = (data ?? []).map((row: any) => {
      const claim = row.claimed_access_statements;
      const claimSourceUrl = claim?.source_url ?? "";
      const claimUserFocus = claim?.user_focus ?? "";
      const baseKeys = [
        "id",
        "journey_code",
        "group_id",
        "mode",
        "campus_or_system",
        "user_focus",
        "journey_goal",
        "claimed_access_statement",
        "claimed_statement_id",
      ];
      const values = [
        ...baseKeys.map((key) => row[key] ?? ""),
        claimSourceUrl,
        claimUserFocus,
        row.what_happened ?? "",
        row.expected_outcome ?? "",
        row.barrier_type ?? "",
        row.where_happened ?? "",
        row.access_result ?? "",
        row.missing_or_unclear ?? "",
        row.suggested_improvement ?? "",
        row.status ?? "",
        row.issue_scope ?? "",
        row.created_at ?? "",
      ];
      return values
        .map((v) => {
          const escaped = String(v).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="week6_journeys.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ??
          "Could not export journeys. Check Supabase configuration.",
      },
      { status: 500 },
    );
  }
}

