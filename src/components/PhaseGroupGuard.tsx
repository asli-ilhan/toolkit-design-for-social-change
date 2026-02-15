"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePhase } from "@/lib/PhaseContext";
import { getRouteAccess, type RouteId, type AccessMode } from "@/lib/accessControl";

type Props = {
  route: RouteId;
  children: React.ReactNode;
};

/** Redirects to home with message if phase cannot access this route (phase-only; group not used). */
export function PhaseGroupGuard({ route, children }: Props) {
  const router = useRouter();
  const { phase } = usePhase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const access: AccessMode = mounted ? getRouteAccess(phase, null, route) : "none";

  useEffect(() => {
    if (!mounted || access !== "none") return;
    const q = route === "export" ? "exportDenied=1" : "accessDenied=1";
    router.replace("/?" + q);
  }, [mounted, access, router, route]);

  if (access === "none") {
    return (
      <div className="mx-auto max-w-md py-12 text-center text-sm text-white/60">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
