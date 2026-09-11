"use client";

import { useState, useTransition } from "react";
import type { Participant } from "@/server/name-election/service";
import { addParticipant, regenerateInvitation, removeParticipant, renameParticipant } from "./actions";

type ParticipantsSetupProps = { initialParticipants: Participant[] };

function invitationUrl(token: string) {
  return `${window.location.origin}/vote/${token}`;
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ParticipantsSetup({ initialParticipants }: ParticipantsSetupProps) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [displayLabel, setDisplayLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ participant: Participant; action: "regenerate" | "remove" } | null>(null);
  const [pending, startTransition] = useTransition();

  function report(error: unknown, fallback: string) {
    setMessage(error instanceof Error ? error.message : fallback);
  }

  function createParticipant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const participant = await addParticipant(displayLabel);
        setParticipants((current) => [...current, participant]);
        setDisplayLabel("");
        setMessage("Deltagaren har lagts till.");
      } catch (error) { report(error, "Kunde inte lägga till deltagaren."); }
    });
  }

  function updateParticipant(id: number, nextDisplayLabel: string) {
    startTransition(async () => {
      try {
        const updated = await renameParticipant(id, nextDisplayLabel);
        setParticipants((current) => current.map((participant) => participant.id === id ? updated : participant));
        setMessage("Deltagaren har bytt namn.");
      } catch (error) { report(error, "Kunde inte byta namn på deltagaren."); }
    });
  }

  function deleteParticipant(id: number) {
    startTransition(async () => {
      try {
        await removeParticipant(id);
        setParticipants((current) => current.filter((participant) => participant.id !== id));
        setMessage("Deltagaren har tagits bort.");
      } catch (error) { report(error, "Kunde inte ta bort deltagaren."); }
    });
  }

  function renewInvitation(id: number) {
    startTransition(async () => {
      try {
        const updated = await regenerateInvitation(id);
        setParticipants((current) => current.map((participant) => participant.id === id ? updated : participant));
        setMessage("Inbjudan har förnyats; den gamla länken fungerar inte längre.");
      } catch (error) { report(error, "Kunde inte förnya inbjudan."); }
    });
  }

  return <section className="card" aria-labelledby="participants-heading">
    <h2 id="participants-heading">Deltagare och inbjudningar</h2>
    <p>Varje deltagare får en personlig inbjudan. Dela den bara med rätt person.</p>
    <form onSubmit={createParticipant}>
      <label htmlFor="participant-display-label">Deltagarnamn</label>
      <input id="participant-display-label" value={displayLabel} onChange={(event) => setDisplayLabel(event.currentTarget.value)} disabled={pending} required />
      <button disabled={pending}>Lägg till deltagare</button>
    </form>
    {message ? <p role="status">{message}</p> : null}
    {participants.length ? <>
      <button type="button" disabled={pending} onClick={() => void copy(participants.map((participant) => `${participant.displayLabel}\n${invitationUrl(participant.invitationToken)}`).join("\n\n")).then(() => setMessage("Alla inbjudningar har kopierats.")).catch((error) => report(error, "Kunde inte kopiera inbjudningarna."))}>Kopiera alla inbjudningar</button>
      <ol className="participant-list">
        {participants.map((participant) => <li key={participant.id}>
          <form onSubmit={(event) => { event.preventDefault(); updateParticipant(participant.id, String(new FormData(event.currentTarget).get("displayLabel") ?? "")); }}>
            <label htmlFor={`participant-${participant.id}`}>Namn för {participant.displayLabel}</label>
            <input id={`participant-${participant.id}`} name="displayLabel" defaultValue={participant.displayLabel} disabled={pending} />
            <button disabled={pending}>Byt namn</button>
          </form>
          <button type="button" disabled={pending} onClick={() => void copy(invitationUrl(participant.invitationToken)).then(() => setMessage(`Inbjudan för ${participant.displayLabel} har kopierats.`)).catch((error) => report(error, "Kunde inte kopiera inbjudan."))}>Kopiera inbjudan</button>
          <button type="button" disabled={pending} onClick={() => setConfirmation({ participant, action: "regenerate" })}>Förnya inbjudan</button>
          <button type="button" disabled={pending} onClick={() => setConfirmation({ participant, action: "remove" })}>Ta bort deltagare</button>
        </li>)}
      </ol>
    </> : <p>Inga deltagare har lagts till ännu.</p>}
    {confirmation ? <section className="card" aria-labelledby="confirmation-heading">
      <h3 id="confirmation-heading">Bekräfta {confirmation.action === "regenerate" ? "förnyelse" : "borttagning"}</h3>
      <p>{confirmation.action === "regenerate" ? `Den tidigare inbjudan för ${confirmation.participant.displayLabel} blir ogiltig direkt.` : `${confirmation.participant.displayLabel} och den personliga inbjudan tas bort direkt.`}</p>
      <button type="button" disabled={pending} onClick={() => { const { action, participant } = confirmation; setConfirmation(null); action === "regenerate" ? renewInvitation(participant.id) : deleteParticipant(participant.id); }}>Bekräfta</button>
      <button type="button" disabled={pending} onClick={() => setConfirmation(null)}>Avbryt</button>
    </section> : null}
  </section>;
}
