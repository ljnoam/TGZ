// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  // on retire également httpOnly ici
  res.cookies.set("admin_logged_in", "", {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    // ⚠️ on ne met pas `httpOnly: true`
  });
  return res;
}
