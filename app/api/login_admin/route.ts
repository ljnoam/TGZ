// app/api/login/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.json({ success: true });
    // Le cookie est HTTP-only, accessible seulement par le serveur/middleware
    res.cookies.set("admin_logged_in", "true", {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return res;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
