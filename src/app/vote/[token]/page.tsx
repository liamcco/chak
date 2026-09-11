import { nameElectionService } from "@/server/name-election";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const participant = await nameElectionService.findParticipantByInvitation(token);

  if (!participant) return <main><p>OGILTIG INBJUDAN</p><h1>Den här länken fungerar inte</h1><p>Be Administratören om en ny personlig inbjudan.</p></main>;

  return <main><p>DIN INBJUDAN</p><h1>Du röstar som {participant.displayLabel}</h1><p>Din personliga länk är redo. Namnvalet öppnar snart.</p></main>;
}
