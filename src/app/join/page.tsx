'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/start");
  }, [router]);
  return null;
}

