import { nameElectionService } from "@/server/name-election";
import { Presentation } from "./presentation";
export const dynamic = "force-dynamic";
export default async function PresentationPage() { const election = await nameElectionService.getDraft(); const suggestions = await nameElectionService.listSuggestions(); const current = suggestions.find((suggestion) => suggestion.position === (election?.presentationPosition ?? -1)) ?? null; return <Presentation initial={current} />; }
