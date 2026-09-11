"use client";
import { useState, useTransition } from "react";
import type { ApprovalSuggestion } from "@/server/name-election/service";
import { saveApprovalChoice } from "@/app/vote/actions";
export function ApprovalBallot({ token, participant, initial }: { token: string; participant: string; initial: { suggestions: ApprovalSuggestion[] } }) {
  const [suggestions, setSuggestions] = useState(initial.suggestions); const [position, setPosition] = useState(0); const [pending, startTransition] = useTransition(); const current = suggestions[position];
  function choose(choice: "yay" | "nay") { if (!current) return; startTransition(async () => { await saveApprovalChoice(token, current.id, choice); setSuggestions((all) => all.map((item) => item.id === current.id ? { ...item, choice } : item)); }); }
  return <main><p>DIN INBJUDAN</p><h1>Du röstar som {participant}</h1>{current ? <section className="card ballot"><p>Suggestion {position + 1} av {suggestions.length}</p><h2>{current.suggestion}</h2><p>{current.motivation}</p><button className="yay" disabled={pending} onClick={() => choose("yay")}>Ja{current.choice === "yay" ? " ✓" : ""}</button><button className="nay" disabled={pending} onClick={() => choose("nay")}>Nej{current.choice === "nay" ? " ✓" : ""}</button><div><button disabled={position === 0} onClick={() => setPosition(position - 1)}>Föregående</button><button disabled={position === suggestions.length - 1} onClick={() => setPosition(position + 1)}>Nästa</button></div></section> : <p>Du är ikapp!</p>}</main>;
}
