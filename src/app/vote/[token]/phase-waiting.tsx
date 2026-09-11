"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PhaseWaiting({ message }: { message: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [router]);

  return <main><p>DIN INBJUDAN</p><h1>En kort paus</h1><p aria-live="polite">{message}</p><button type="button" onClick={() => router.refresh()}>Uppdatera</button></main>;
}
