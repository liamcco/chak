"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/server/auth/admin";

export async function logout() { await signOut(); redirect("/"); }
