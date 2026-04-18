import { NextResponse } from "next/server";
import { logoutAction } from "@/app/auth/actions";

export async function POST() {
  await logoutAction();
  return NextResponse.json({ success: true });
}
