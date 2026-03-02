import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Stripe webhook はauth不要（署名検証で保護）
  if (pathname.startsWith("/api/stripe/webhook")) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (
    !user &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/register") &&
    !pathname.startsWith("/forgot-password") &&
    !pathname.startsWith("/api/auth") &&
    pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Fetch role once for all protected route checks
  const needsRoleCheck =
    user &&
    (pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/company"));

  const role = needsRoleCheck
    ? (await supabase.from("users").select("role").eq("id", user!.id).single())
        .data?.role
    : null;

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password"))
  ) {
    const url = request.nextUrl.clone();
    if (role === "admin") {
      url.pathname = "/admin";
    } else if (role === "company_admin") {
      url.pathname = "/company";
    } else {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Protect admin routes
  if (user && pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protect company-admin routes
  if (user && pathname.startsWith("/company") && role !== "company_admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
