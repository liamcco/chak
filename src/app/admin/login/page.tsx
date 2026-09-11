import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main><section className="card"><p>ADMINISTRATÖR</p><h1>Välkommen in</h1><form action={login}><label htmlFor="password">Lösenord</label><input id="password" name="password" type="password" required autoFocus /><button type="submit">Logga in</button>{error && <p role="alert">Fel lösenord.</p>}</form></section></main>;
}
