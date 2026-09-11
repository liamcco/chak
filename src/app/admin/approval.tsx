"use client";
import { useState, useTransition } from "react";
import type { NameElection } from "@/server/name-election/service";
import { movePresentation, openApprovalRound, revealNextSuggestion } from "./actions";
export function ApprovalControls({ initialState }: { initialState: NameElection }) {
  const [state, setState] = useState(initialState); const [confirmation, setConfirmation] = useState(false); const [pending, startTransition] = useTransition();
  const frontier = state.revealFrontier ?? -1; const position = state.presentationPosition ?? -1;
  function run(action: () => Promise<NameElection>) { startTransition(async () => { try { setState(await action()); } catch (error) { alert(error instanceof Error ? error.message : "Kunde inte ändra Approval Round."); } }); }
  if (state.phase === "draft") return <section className="card"><h2>Approval Round</h2><p>Öppna rondens frusna roster och Suggestions. Detta kan inte ångras.</p>{confirmation ? <><p>Efter öppning kan roster, innehåll och ordning inte ändras.</p><button disabled={pending} onClick={() => { setConfirmation(false); run(openApprovalRound); }}>Bekräfta öppning</button><button disabled={pending} onClick={() => setConfirmation(false)}>Avbryt</button></> : <button onClick={() => setConfirmation(true)}>Öppna Approval Round</button>}</section>;
  return <section className="card"><h2>Approval Round</h2><p>Reveal Frontier: {frontier + 1} · Presentation Position: {position + 1}</p><button disabled={pending || frontier >= 31} onClick={() => run(revealNextSuggestion)}>Nästa Suggestion</button><div><button disabled={pending || position <= 0} onClick={() => run(() => movePresentation(position - 1))}>Föregående presentation</button><button disabled={pending || position >= frontier} onClick={() => run(() => movePresentation(position + 1))}>Nästa presentation</button></div><p>Presentation: <a href="/present" target="_blank">öppna delad skärm</a></p></section>;
}
