import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/onboarding",
  "/plan",
  "/workout",
  "/exercises",
  "/coach",
  "/motivation",
  "/admin",
];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
}

function copyResponseCookies(
  source: NextResponse,
  target: NextResponse
) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  return target;
}

export async function proxy(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublicKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublicKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } =
    request.nextUrl;

  if (
    !user &&
    isProtectedPath(pathname)
  ) {
    const loginUrl = new URL(
      "/login",
      request.url
    );

    loginUrl.searchParams.set(
      "redirect",
      `${pathname}${search}`
    );

    return copyResponseCookies(
      response,
      NextResponse.redirect(loginUrl)
    );
  }

  if (
    user &&
    (pathname === "/login" ||
      pathname === "/register")
  ) {
    return copyResponseCookies(
      response,
      NextResponse.redirect(
        new URL("/dashboard", request.url)
      )
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
