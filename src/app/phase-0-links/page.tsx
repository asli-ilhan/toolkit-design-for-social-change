'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";

const OFFICIAL_LINKS = [
  { label: "UAL accessibility statement", url: "https://www.arts.ac.uk/accessibility-statement" },
  { label: "IT Services", url: "https://www.arts.ac.uk/students/it-services" },
  { label: "Disability and Dyslexia support", url: "https://www.arts.ac.uk/students/student-services/disability-and-dyslexia" },
  { label: "Smartcards and building access", url: "https://www.arts.ac.uk/students/locations-and-opening-times/central-saint-martins/smartcards-and-building-access" },
];

type Identity = { displayName: string; groupId: string; sessionId: string };

export default function Phase0LinksPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [userUrls, setUserUrls] = useState<{ id: string; url: string; label: string }[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("week6-identity");
    if (raw) try { setIdentity(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("claimed_source_urls")
          .select("id, url, label")
          .order("created_at", { ascending: false })
          .limit(20);
        if (!cancelled && data) setUserUrls(data as { id: string; url: string; label: string }[]);
      } catch {
        // ignore
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  };

  const addUrl = async () => {
    const url = newUrl.trim();
    if (!url || !identity) return;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("claimed_source_urls")
        .insert({
          url,
          label: newLabel.trim() || null,
          created_session_id: identity.sessionId,
          created_name: identity.displayName,
          created_group_id: identity.groupId,
        })
        .select("id, url, label")
        .single();
      if (error) throw error;
      if (data) setUserUrls((prev) => [data as { id: string; url: string; label: string }, ...prev]);
      setNewUrl("");
      setNewLabel("");
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Phase 0 · Claimed Access Scan
        </div>
        <h1 className="mt-2 text-xl font-semibold">Official UAL guidance links</h1>
        <p className="mt-1 text-sm text-white/70">
          Use these starting points and add any other relevant pages you find. Collect URLs you can cite when documenting claimed vs experienced access.
        </p>
      </div>

      <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-3">
        <h2 className="text-sm font-semibold">Starting points</h2>
        <ul className="space-y-2 text-sm">
          {OFFICIAL_LINKS.map(({ label, url }) => (
            <li key={url} className="flex flex-wrap items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-white/90 underline hover:text-white"
              >
                {label}
              </a>
              <span className="text-white/50 text-[11px] truncate max-w-[200px] sm:max-w-none">{url}</span>
              <button
                type="button"
                onClick={() => copyUrl(url)}
                className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/10"
              >
                {copied === url ? "Copied" : "Copy"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {identity && (
        <section className="rounded-xl border border-white/15 bg-white/[0.02] p-5 space-y-3">
          <h2 className="text-sm font-semibold">Add URL you found</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://…"
              className="flex-1 rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full sm:w-40 rounded-md border border-white/25 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={addUrl}
              disabled={!newUrl.trim()}
              className="rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {userUrls.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-[12px]">
              {userUrls.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-2">
                  <a href={u.url} target="_blank" rel="noreferrer" className="text-white/85 underline hover:text-white truncate max-w-[180px] sm:max-w-none">{u.label || u.url}</a>
                  <button type="button" onClick={() => copyUrl(u.url)} className="rounded border border-white/25 px-1.5 py-0.5 text-[10px] text-white/70 hover:bg-white/10">Copy</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Link
        href="/"
        className="inline-flex rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 w-fit"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
