import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/auth/actions";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ authenticated: !!user, user });
}
