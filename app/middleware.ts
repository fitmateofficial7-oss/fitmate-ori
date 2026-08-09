import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    });


  // ==========================================
  // CREATE SUPABASE SERVER CLIENT
  // ==========================================

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                request.cookies.set(
                  name,
                  value
                );

                response =
                  NextResponse.next(
                    {
                      request,
                    }
                  );

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


  // ==========================================
  // GET CURRENT USER
  // ==========================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();


  // ==========================================
  // CURRENT PATH
  // ==========================================

  const pathname =
    request.nextUrl.pathname;


  // ==========================================
  // PROTECTED ROUTES
  // ==========================================

  const protectedRoutes = [
    "/onboarding",
    "/plan",
    "/workout",
  ];


  const isProtectedRoute =
    protectedRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(
          `${route}/`
        )
    );


  // ==========================================
  // PUBLIC ROUTES
  // ==========================================

  const publicRoutes = [
    "/",
    "/login",
    "/register",
  ];


  const isPublicRoute =
    publicRoutes.includes(
      pathname
    );


  // ==========================================
  // USER BELUM LOGIN
  // AKSES PROTECTED ROUTE
  // ==========================================

  if (
    isProtectedRoute &&
    !user
  ) {

    console.log(
      "Unauthorized access attempt:",
      pathname
    );


    const loginUrl =
      new URL(
        "/login",
        request.url
      );


    // Simpan halaman tujuan
    loginUrl.searchParams.set(
      "redirect",
      pathname
    );


    return NextResponse.redirect(
      loginUrl
    );

  }


  // ==========================================
  // USER SUDAH LOGIN
  // AKSES LOGIN / REGISTER
  // ==========================================

  if (
    user &&
    (
      pathname === "/login" ||
      pathname === "/register"
    )
  ) {

    return NextResponse.redirect(
      new URL(
        "/plan",
        request.url
      )
    );

  }


  // ==========================================
  // RETURN RESPONSE
  // ==========================================

  return response;
}


// ==========================================
// MIDDLEWARE CONFIG
// ==========================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - image files
     */

    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};