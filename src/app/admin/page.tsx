import { requireAdministrator } from "@/server/auth/admin";
import { nameElectionService } from "@/server/name-election";
import { logout } from "./actions";

export default async function AdminPage() {
  await requireAdministrator();
  const election = await nameElectionService.establishDraft();
  return <main><p>ADMINISTRATÖR</p><h1>Namnvalet väntar</h1><section className="card"><h2>Utkast</h2><p>Det här är ett tomt Draft Name Election. Förslag, Participants och röstning läggs till i kommande steg.</p><p>Election-ID: {election.id}</p><form action={logout}><button type="submit">Logga ut</button></form></section></main>;
}
