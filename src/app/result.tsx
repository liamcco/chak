"use client";
import { useEffect, useState } from "react";
import type { PublishedResult } from "@/server/name-election/service";
export function ResultReveal({ initial }: { initial: PublishedResult | null }) {
  const [result, setResult] = useState(initial);
  useEffect(() => { const refresh = async () => { const response = await fetch("/api/result", { cache: "no-store" }); if (response.ok) setResult(await response.json()); }; const timer = window.setInterval(() => void refresh(), 2500); return () => window.clearInterval(timer); }, []);
  if (!result) return <section className="card result-waiting"><h1>Result Reveal</h1><p>Administratören förbereder den stora finalen.</p></section>;
  return <section className="result-reveal" aria-live="polite"><div className="curtain" aria-hidden="true">♪ ♫ ♪</div><p className="eyebrow">RESULT REVEAL</p><h1>{result.winners.length > 1 ? "Joint Winners" : "Winner"}</h1><div className="winners">{result.winners.map((winner) => <article className="winner" key={winner.id}><span>★</span><strong>{winner.suggestion}</strong><p>{winner.motivation}</p></article>)}</div><h2>Final Vote totals</h2><ol className="final-totals">{result.finalists.map(({ suggestion, total }) => <li key={suggestion.id}><span>{suggestion.suggestion}</span><strong>{total} Vote Tokens</strong></li>)}</ol><p className="turnout">Turnout: {result.turnout} / {result.participantCount} Participants</p></section>;
}
