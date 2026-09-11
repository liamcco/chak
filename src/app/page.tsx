import Link from "next/link";

export default function LandingPage() {
  return <main><p>KÖRNAMNSVALET</p><h1>En kör. Ett namn.</h1><p>Välkommen till vårt gemensamma namnelection. För att delta behöver du en personlig <strong>Invitation</strong> från Administratören.</p><p><Link href="/present">Presentation</Link> <span aria-hidden>·</span> <Link href="/admin/login">Administratör</Link></p></main>;
}
