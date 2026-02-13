"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePhase } from "@/lib/PhaseContext";
import {
  getGroupNumber,
  getRouteAccess,
  type RouteId,
  type AccessMode,
} from "@/lib/accessControl";

type Props = {
  route: RouteId;
  children: React.ReactNode;
};

/** Redirects to home with message if phase+group cannot access this route. */
export function PhaseGroupGuard({ route, children }: Props) {
  const router = useRouter();
  const { phase } = usePhase();
  const [groupNumber, setGroupNumber] = useState<1 | 2 | 3 | 4 | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setGroupNumber(getGroupNumber());
    setMounted(true);
  }, []);

  const access: AccessMode = mounted ? getRouteAccess(phase, groupNumber, route) : "none";

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
