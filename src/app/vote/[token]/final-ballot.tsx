"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FinalBallot as FinalBallotData } from "@/server/name-election/service";
import { getFinalVote, saveFinalAllocation } from "../actions";

export function FinalBallot({ token, participant, initial }: { token: string; participant: string; initial: FinalBallotData }) {
  const [allocations, setAllocations] = useState(initial.allocations);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => { const refresh = async () => { try { const next = await getFinalVote(token); if (next) setAllocations(next.ballot.allocations); else router.refresh(); } catch { router.refresh(); } }; const timer = window.setInterval(() => void refresh(), 2500); return () => window.clearInterval(timer); }, [router, token]);
  const used = allocations.reduce((sum, a) => sum + a.voteTokens, 0);
  function change(suggestionId: number, amount: number) {
    const current = allocations.find((a) => a.suggestionId === suggestionId)?.voteTokens ?? 0;
    const next = Math.max(0, current + amount);
    if (used - current + next > initial.voteTokenAllowance) return;
    setAllocations((all) => all.map((a) => a.suggestionId === suggestionId ? { ...a, voteTokens: next } : a));
    startTransition(async () => { try { await saveFinalAllocation(token, suggestionId, next); } catch (error) { alert(error instanceof Error ? error.message : "Kunde inte spara Ballot."); } });
  }
  return <main><p>DIN INBJUDAN</p><h1>Final Vote</h1><p>Du röstar som {participant}</p><p className="remaining" aria-live="polite">Kvarvarande Vote Tokens: {initial.voteTokenAllowance - used}</p>{initial.finalists.map((finalist) => { const count = allocations.find((a) => a.suggestionId === finalist.id)?.voteTokens ?? 0; return <section className="card final-card" key={finalist.id}><h2>{finalist.suggestion}</h2><p>{finalist.motivation}</p><p className="tokens" aria-label={`${count} Vote Tokens`}>{Array.from({ length: count }, (_, i) => <span key={i}>●</span>)}</p><button disabled={pending || count === 0} aria-label={`Ta bort Vote Token från ${finalist.suggestion}`} onClick={() => change(finalist.id, -1)}>−</button><button disabled={pending || used >= initial.voteTokenAllowance} aria-label={`Lägg till Vote Token på ${finalist.suggestion}`} onClick={() => change(finalist.id, 1)}>+</button></section>; })}<p role="status">{used === initial.voteTokenAllowance ? "Ballot komplett" : "Fördela alla Vote Tokens för att bli klar."}</p></main>;
}
