// app/api/login_admin/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.json({ success: true });
    // On n’utilise plus httpOnly, pour que document.cookie puisse le lire
    res.cookies.set("admin_logged_in", "true", {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 jour
      // ⚠️ on ne met pas `httpOnly: true`
    });
    return res;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
