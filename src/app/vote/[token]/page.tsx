import { nameElectionService } from "@/server/name-election";
import { ApprovalBallot } from "./ballot";
import { FinalBallot } from "./final-ballot";
export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const approval = await nameElectionService.getApprovalForInvitation(token);

  if (!approval) return <main><p>OGILTIG INBJUDAN</p><h1>Den här länken fungerar inte</h1><p>Be Administratören om en ny personlig inbjudan.</p></main>;

  if (approval.state.phase === "draft") return <main><p>DIN INBJUDAN</p><h1>Du röstar som {approval.participant.displayLabel}</h1><p>Namnvalet öppnar snart.</p></main>;
  if (["final-open", "final-closed"].includes(approval.state.phase)) {
    const final = await nameElectionService.getFinalVoteForInvitation(token);
    if (final) return <FinalBallot token={token} participant={final.participant.displayLabel} initial={final.ballot} />;
  }
  return <ApprovalBallot token={token} participant={approval.participant.displayLabel} initial={approval} />;
}
