'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

type GroupRow = {
  id: string;
  name: string;
  role_key: string | null;
  role_title: string | null;
};

type Identity = {
  displayName: string;
  groupId: string;
  groupName: string;
  sessionId: string;
};

export default function StartPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: dbError } = await supabase
          .from("groups")
          .select("id, name, role_key, role_title")
          .order("created_at", { ascending: true });
        if (dbError) throw dbError;
        if (!cancelled && data) {
          setGroups(data as GroupRow[]);
        }
        if (!cancelled && typeof window !== "undefined") {
          const raw = window.localStorage.getItem("week6-identity");
          if (raw) {
            try {
              const parsed: Identity = JSON.parse(raw);
              if (parsed.displayName) setDisplayName(parsed.displayName);
              if (parsed.groupId) setGroupId(parsed.groupId);
            } catch {
              // ignore
            }
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message ??
              "Could not load groups. Check Supabase configuration.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (displayName.trim().length < 2 || displayName.trim().length > 30) {
      setError("Display name must be between 2 and 30 characters.");
      return;
    }
    if (!groupId) {
      setError("Choose a group so we can attribute entries.");
      return;
    }
    const groupName = groups.find((g) => g.id === groupId)?.name ?? "Group";
    const sessionId =
      (typeof window !== "undefined" &&
        window.localStorage.getItem("week6-session-id")) ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

    if (typeof window !== "undefined") {
      const identity: Identity = {
        displayName: displayName.trim(),
        groupId,
        groupName,
        sessionId,
      };
      window.localStorage.setItem("week6-identity", JSON.stringify(identity));
      window.localStorage.setItem("week6-session-id", sessionId);
    }

    router.push("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Start · Name & group
        </div>
        <h1 className="mt-2 text-xl font-semibold">
          Access Journey Logging Toolkit
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Enter your name and choose your table or group. This is used for
          attribution in the shared feed. The workshop runs in phases; everyone
          starts with evidence collection, then the room splits for Phase 2.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-white/15 bg-white/[0.02] p-5"
      >
        <div className="space-y-1">
          <label className="text-[11px] text-white/70">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Ayesha (G3)"
            className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
          />
          <p className="text-[11px] text-white/55">
            Use a name your group recognises (first name or initials).
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-white/70">Group</label>
          {loading ? (
            <p className="text-[11px] text-white/60">Loading groups…</p>
          ) : groups.length > 0 ? (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white focus:border-white/60 focus:outline-none"
            >
              <option value="">Select your group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[11px] text-white/60">
              No groups configured yet. Ask your tutor to add groups in
              Supabase.
            </p>
          )}
          <p className="text-[11px] text-white/55">
            Pick the group or table you’re at. You’ll see phase-based
            instructions on the home screen.
          </p>
        </div>

        {error && (
          <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="mt-2 inline-flex w-full items-center justify-center rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
        >
          Continue
        </button>
      </form>
    </div>
  );
}

