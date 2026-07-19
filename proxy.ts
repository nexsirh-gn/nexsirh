import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p)) || path === "/";
  const isAdminLogin = path === "/admin";

  // Non connecté → page de connexion de l'espace concerné
  if (!user && !isPublic && !isAdminLogin) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith("/admin") ? "/admin" : "/connexion";
    return NextResponse.redirect(url);
  }

  // Console plateforme : réservée au rôle super_admin (la RLS limite déjà les
  // données, mais l'ACCÈS à la console est lui-même un contrôle de sécurité)
  if (user && path.startsWith("/admin") && !isAdminLogin) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profil?.role !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
