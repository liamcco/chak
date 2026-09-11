"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/server/auth/admin";

export async function login(formData: FormData) {
  const authenticated = await signIn(String(formData.get("password") ?? ""));
  if (!authenticated) redirect("/admin/login?error=invalid");
  redirect("/admin");
}
