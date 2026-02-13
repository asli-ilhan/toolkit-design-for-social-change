export default function ExampleJourneyPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Screen 05 · Example entry
        </div>
        <h1 className="mt-2 text-xl font-semibold">
          Example journey · Physical access
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Use this as a reference when logging your own entries. Notice how
          observation, interpretation, and action are separated.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="font-mono text-[11px] text-white/80">
            Journey code: UAL-W6-G3-001
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full border border-white/30 px-2 py-[2px] uppercase tracking-[0.18em] text-white/70">
              Physical
            </span>
            <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
              UAL Camberwell Peckham Building
            </span>
            <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
              Focus: Wheelchair
            </span>
          </div>
        </div>

        <div className="space-y-1 text-sm text-white/80">
          <div className="font-semibold">Journey goal</div>
          <p>Reach a studio on the 2nd floor.</p>
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Steps
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-white/80">
          <li>
            <div className="font-semibold">Step 1</div>
            <div>
              <span className="font-medium">Go to:</span> Main entrance
              (Entrance A)
            </div>
            <div>
              <span className="font-medium">Attempt to:</span> Use step-free
              route to enter
            </div>
            <div>
              <span className="font-medium">Observe:</span> Ramp route not
              signposted.
            </div>
          </li>
          <li>
            <div className="font-semibold">Step 2</div>
            <div>
              <span className="font-medium">Go to:</span> Lift bank near
              reception
            </div>
            <div>
              <span className="font-medium">Attempt to:</span> Use lift to
              access 2nd floor
            </div>
            <div>
              <span className="font-medium">Observe:</span> Lift out of service;
              no alternative route info.
            </div>
          </li>
          <li>
            <div className="font-semibold">Step 3</div>
            <div>
              <span className="font-medium">Go to:</span> Stairwell signage area
            </div>
            <div>
              <span className="font-medium">Attempt to:</span> Find alternate
              step-free path
            </div>
            <div>
              <span className="font-medium">Observe:</span> No QR/help point;
              staff directions inconsistent.
            </div>
          </li>
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Outcome (observation vs expectation)
          </div>
          <div>
            <div className="font-semibold">What happened (factual)</div>
            <p className="text-white/80">
              Lift was out of service and the step-free alternative route was
              not clearly signposted.
            </p>
          </div>
          <div>
            <div className="font-semibold">Expected outcome</div>
            <p className="text-white/80">
              A clearly signposted step-free route with live lift status
              information.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
              Barrier: Mixed (Physical + Information)
            </span>
            <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
              Where: Navigation
            </span>
            <span className="rounded-full border border-white/30 px-2 py-[2px] text-white/80">
              Result: Blocked
            </span>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Interpretation + action
          </div>
          <div>
            <div className="font-semibold">
              Missing / unclear (interpretation)
            </div>
            <p className="text-white/80">
              No public info for lift outages or where to check accessibility
              disruptions.
            </p>
          </div>
          <div>
            <div className="font-semibold">
              Suggested improvement (action)
            </div>
            <p className="text-white/80">
              Publish lift outage status on a single page + QR code at lift; add
              consistent signage to step-free routes.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Evidence
        </div>
        <ul className="list-disc space-y-1 pl-5 text-white/80">
          <li>Photo of lift notice (no faces).</li>
          <li>Link to accessibility statement / campus access page.</li>
        </ul>
      </section>
    </div>
  );
}

