import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  const noteId = request.nextUrl.searchParams.get("note");

  try {
    const supabase = getSupabaseClient();
    let journeyIds: string[] = [];

    if (noteId) {
      const { data: note, error: noteError } = await supabase
        .from("story_board_notes")
        .select("linked_journey_ids")
        .eq("id", noteId)
        .single();
      if (noteError || !note?.linked_journey_ids?.length) {
        return NextResponse.json(
          { error: "Story note not found or has no linked journeys." },
          { status: 404 }
        );
      }
      journeyIds = note.linked_journey_ids as string[];
    } else if (idsParam) {
      journeyIds = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    }

    if (journeyIds.length === 0) {
      return NextResponse.json(
        { error: "Provide ids=id1,id2,... or note=<story_note_id>" },
        { status: 400 }
      );
    }

    const { data: journeys, error: jError } = await supabase
      .from("journeys")
      .select("*")
      .in("id", journeyIds);

    if (jError) throw jError;
    if (!journeys?.length) {
      return NextResponse.json(
        { error: "No journeys found for the given IDs." },
        { status: 404 }
      );
    }

    const { data: steps } = await supabase
      .from("journey_steps")
      .select("*")
      .in("journey_id", journeyIds)
      .order("step_index");

    const { data: evidence } = await supabase
      .from("evidence")
      .select("*")
      .in("journey_id", journeyIds);

    const pack = {
      exported_at: new Date().toISOString(),
      journey_ids: journeyIds,
      journeys,
      steps: steps ?? [],
      evidence: evidence ?? [],
    };

    return NextResponse.json(pack, {
      headers: {
        "Content-Disposition": `attachment; filename="week6_story_pack_${Date.now()}.json"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed." },
      { status: 500 }
    );
  }
}
