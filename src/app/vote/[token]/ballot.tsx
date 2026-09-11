"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ApprovalSuggestion } from "@/server/name-election/service";
import { getApproval, saveApprovalChoice } from "@/app/vote/actions";

type SaveState = "confirmed" | "pending" | "retrying" | "failed";
type BallotItem = ApprovalSuggestion & { saveState: SaveState; failedChoice?: "yay" | "nay" };

export function ApprovalBallot({ token, participant, initial }: { token: string; participant: string; initial: { suggestions: ApprovalSuggestion[]; position: number } }) {
  const [suggestions, setSuggestions] = useState<BallotItem[]>(() => initial.suggestions.map((item) => ({ ...item, saveState: "confirmed" })));
  const [position, setPosition] = useState(initial.position); const [message, setMessage] = useState<string | null>(null); const [pending, startTransition] = useTransition(); const current = suggestions[position];
  const firstUnanswered = useMemo(() => suggestions.findIndex((item) => !item.choice), [suggestions]);

  useEffect(() => {
    const refresh = async () => { try { const next = await getApproval(token); if (!next) return; if (next.state.phase !== "approval-open") { window.location.reload(); return; } setSuggestions((old) => next.suggestions.map((item) => { const previous = old.find((candidate) => candidate.id === item.id); return previous && ["pending", "retrying", "failed"].includes(previous.saveState) ? { ...item, saveState: previous.saveState, failedChoice: previous.failedChoice } : { ...item, saveState: item.choice ? "confirmed" : "confirmed" }; })); } catch { /* silent polling */ } };
    const timer = window.setInterval(() => void refresh(), 2500); return () => window.clearInterval(timer);
  }, [token]);

  function choose(choice: "yay" | "nay", retry = false) {
    if (!current || current.saveState === "pending" || current.saveState === "retrying") return;
    const id = current.id; setSuggestions((all) => all.map((item) => item.id === id ? { ...item, choice, saveState: retry ? "retrying" : "pending", failedChoice: undefined } : item)); setMessage(null);
    startTransition(async () => { try { await saveApprovalChoice(token, id, choice); setSuggestions((all) => all.map((item) => item.id === id ? { ...item, choice, saveState: "confirmed" } : item)); } catch { setSuggestions((all) => all.map((item) => item.id === id ? { ...item, saveState: "failed", failedChoice: choice } : item)); setMessage("Valet kunde inte sparas. Försök igen."); } });
  }

  return <main><p>DIN INBJUDAN</p><h1>Du röstar som {participant}</h1>{current ? <section className="card ballot" aria-live="polite"><p>Suggestion {position + 1} av {suggestions.length}</p><h2>{current.suggestion}</h2><p>{current.motivation}</p><button className="yay" disabled={pending || current.saveState === "pending" || current.saveState === "retrying"} onClick={() => choose("yay")}>Ja{current.choice === "yay" ? " ✓" : ""}</button><button className="nay" disabled={pending || current.saveState === "pending" || current.saveState === "retrying"} onClick={() => choose("nay")}>Nej{current.choice === "nay" ? " ✓" : ""}</button><p role="status">{current.saveState === "pending" ? "Sparar…" : current.saveState === "retrying" ? "Försöker spara igen…" : current.saveState === "confirmed" && current.choice ? "Sparat" : current.saveState === "failed" ? "Sparningen misslyckades" : message}</p>{current.saveState === "failed" && current.failedChoice ? <button type="button" onClick={() => choose(current.failedChoice!, true)}>Försök spara igen</button> : null}<div><button disabled={position === 0} onClick={() => setPosition(position - 1)}>Föregående</button><button disabled={position === suggestions.length - 1} onClick={() => setPosition(position + 1)}>Nästa</button>{firstUnanswered >= 0 && firstUnanswered !== position ? <button type="button" onClick={() => setPosition(firstUnanswered)}>Gå till nästa obesvarade</button> : null}</div></section> : <section className="caught-up"><p aria-live="polite">Du är ikapp!</p><button type="button" onClick={() => window.location.reload()}>Uppdatera</button></section>}</main>;
}
