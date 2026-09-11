import { requireAdministrator } from "@/server/auth/admin";
import { nameElectionService } from "@/server/name-election";
import { logout } from "./actions";
import { SuggestionsSetup } from "./suggestions";
import { ParticipantsSetup } from "./participants";
import { ApprovalControls } from "./approval";

export default async function AdminPage() {
  await requireAdministrator();
  const election = await nameElectionService.establishDraft();
  const suggestions = await nameElectionService.listSuggestions();
  const participants = await nameElectionService.listParticipants();
  const overview = await nameElectionService.getApprovalOverview();
  const results = ["approval-closed", "final-prepared", "complete"].includes(election.phase) ? await nameElectionService.getApprovalResults() : undefined;
  const finalOverview = ["final-prepared", "final-open", "final-closed"].includes(election.phase) ? await nameElectionService.getFinalVoteOverview() : undefined;
  return <main><p>ADMINISTRATÖR</p><h1>Namnvalet väntar</h1><section className="card"><h2>Utkast</h2><p>Förbered Suggestions innan Approval Round öppnas.</p><p>Election-ID: {election.id}</p><form action={logout}><button type="submit">Logga ut</button></form></section>{election.phase === "draft" ? <><ParticipantsSetup initialParticipants={participants} /><SuggestionsSetup initialSuggestions={suggestions} /></> : null}<ApprovalControls initialState={election} overview={overview} results={results} finalOverview={finalOverview} /></main>;
}
