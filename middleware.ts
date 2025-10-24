import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;

  const protectedRoutes = ["/upload", "/dashboard"];
  const pathname = req.nextUrl.pathname;

  if (protectedRoutes.includes(pathname) && !user) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}
