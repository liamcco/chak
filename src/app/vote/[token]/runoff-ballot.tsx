"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RunoffBallot as RunoffBallotData } from "@/server/name-election/service";
import { getRunoff, saveRunoffChoice } from "../actions";

export function RunoffBallot({ token, participant, initial }: { token: string; participant: string; initial: RunoffBallotData }) {
  const [choice, setChoice] = useState(initial.choice); const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => { const refresh = async () => { try { const next = await getRunoff(token); if (next) setChoice(next.ballot.choice); else router.refresh(); } catch { router.refresh(); } }; const timer = window.setInterval(() => void refresh(), 2500); return () => window.clearInterval(timer); }, [router, token]);
  function choose(id: number) { setChoice(id); startTransition(async () => { try { await saveRunoffChoice(token, id); } catch (error) { alert(error instanceof Error ? error.message : "Kunde inte spara valet."); } }); }
  return <main><p>DIN INBJUDAN</p><h1>Runoff</h1><p>Du röstar som {participant}. Välj en Finalist.</p>{initial.finalists.map((finalist) => <section className="card" key={finalist.id}><h2>{finalist.suggestion}</h2><p>{finalist.motivation}</p><button disabled={pending} aria-pressed={choice === finalist.id} onClick={() => choose(finalist.id)}>{choice === finalist.id ? "Vald" : "Välj"}</button></section>)}</main>;
}
