import { nameElectionService } from "@/server/name-election";
import { ApprovalBallot } from "./ballot";
import { FinalBallot } from "./final-ballot";
import { RunoffBallot } from "./runoff-ballot";
import { PhaseWaiting } from "./phase-waiting";
import { ResultReveal } from "../../result";
export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const approval = await nameElectionService.getApprovalForInvitation(token);

  if (!approval) return <main><p>OGILTIG INBJUDAN</p><h1>Den här länken fungerar inte</h1><p>Be Administratören om en ny personlig inbjudan.</p></main>;

  if (approval.state.phase === "draft") return <main><p>DIN INBJUDAN</p><h1>Du röstar som {approval.participant.displayLabel}</h1><p>Namnvalet öppnar snart.</p></main>;
  if (approval.state.phase === "final-open") {
    const final = await nameElectionService.getFinalVoteForInvitation(token);
    if (final) return <FinalBallot token={token} participant={final.participant.displayLabel} initial={final.ballot} />;
  }
  if (approval.state.phase === "runoff-open") {
    const runoff = await nameElectionService.getRunoffForInvitation(token);
    if (runoff) return <RunoffBallot token={token} participant={runoff.participant.displayLabel} initial={runoff.ballot} />;
  }
  if (approval.state.phase === "complete") return <main><ResultReveal initial={await nameElectionService.getPublishedResult()} /></main>;
  if (approval.state.phase === "approval-closed" || approval.state.phase === "final-prepared") return <PhaseWaiting message="Administratören förbereder nästa rond." />;
  if (approval.state.phase === "final-closed") return <PhaseWaiting message="Final Vote är stängd. Administratören förbereder nästa steg." />;
  if (approval.state.phase === "runoff-closed") return <PhaseWaiting message="Runoff är stängd. Administratören sammanställer nästa steg." />;
  return <ApprovalBallot token={token} participant={approval.participant.displayLabel} initial={approval} />;
}
