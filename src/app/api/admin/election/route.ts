import { NextResponse } from "next/server";
import { isAdministrator } from "@/server/auth/admin";
import { nameElectionService } from "@/server/name-election";

export async function POST() {
  if (!(await isAdministrator())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const election = await nameElectionService.establishDraft();
  return NextResponse.json(election);
}
