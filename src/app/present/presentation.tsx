"use client";
import { useEffect, useState } from "react";
import type { Suggestion } from "@/server/name-election/service";

export function Presentation({ initial }: { initial: Suggestion | null }) {
  const [current, setCurrent] = useState(initial);
  useEffect(() => { const refresh = async () => { try { const response = await fetch("/api/presentation", { cache: "no-store" }); if (response.ok) setCurrent(await response.json()); } catch { /* manual refresh remains available */ } }; const timer = window.setInterval(() => void refresh(), 2500); return () => window.clearInterval(timer); }, []);
  return <main className="presentation"><p>PRESENTATION</p><h1>{current?.suggestion ?? "Körnamnsvalet"}</h1><p className="motivation">{current?.motivation ?? "Presentation startar när Administratören öppnar Approval Round."}</p><button type="button" onClick={() => window.location.reload()}>Uppdatera</button></main>;
}
