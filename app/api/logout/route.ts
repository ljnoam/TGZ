// app/api/logout/route.ts

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  // Pour supprimer le cookie, on met une maxAge à 0
  res.cookies.set("admin_logged_in", "", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}
