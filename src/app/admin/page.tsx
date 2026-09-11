import { requireAdministrator } from "@/server/auth/admin";
import { nameElectionService } from "@/server/name-election";
import { logout } from "./actions";
import { SuggestionsSetup } from "./suggestions";
import { ParticipantsSetup } from "./participants";

export default async function AdminPage() {
  await requireAdministrator();
  const election = await nameElectionService.establishDraft();
  const suggestions = await nameElectionService.listSuggestions();
  const participants = await nameElectionService.listParticipants();
  return <main><p>ADMINISTRATÖR</p><h1>Namnvalet väntar</h1><section className="card"><h2>Utkast</h2><p>Förbered Suggestions innan Approval Round öppnas.</p><p>Election-ID: {election.id}</p><form action={logout}><button type="submit">Logga ut</button></form></section><ParticipantsSetup initialParticipants={participants} /><SuggestionsSetup initialSuggestions={suggestions} /></main>;
}
