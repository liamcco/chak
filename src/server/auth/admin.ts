import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/server/env";
import { createSessionManager } from "./session";

export const adminSessionCookie = "kornamnsvalet_admin";
const sessions = createSessionManager(env.SESSION_SECRET);

export async function isAdministrator() {
  const token = (await cookies()).get(adminSessionCookie)?.value;
  return token ? sessions.verify(token) : false;
}

export async function requireAdministrator() {
  if (!(await isAdministrator())) redirect("/admin/login");
}

export async function signIn(password: string) {
  if (password !== env.ADMIN_PASSWORD) return false;
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie, await sessions.create(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessions.maxAge,
  });
  return true;
}

export async function signOut() {
  (await cookies()).delete(adminSessionCookie);
}
