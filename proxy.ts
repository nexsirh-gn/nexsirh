import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

/**
 * Matrice d'accès aux sections de l'application cliente (CLAUDE.md §5.2).
 * La RLS reste l'autorité sur les DONNÉES ; ce garde-fou empêche d'ouvrir
 * un écran auquel le rôle n'a pas droit (pages vides, actions grisées,
 * fuite de structure). Une section absente de la table est ouverte à tous
 * les rôles du tenant.
 */
const SECTION_ROLES: Record<string, string[]> = {
  "/employes": ["admin", "rh", "dg", "manager"],
  "/conges": ["admin", "rh", "dg", "manager"],
  "/temps": ["admin", "rh", "dg", "manager"],
  "/paie": ["admin", "rh", "dg", "comptable"],
  "/documents": ["admin", "rh", "dg", "comptable"],
  "/rapports": ["admin", "rh", "dg", "comptable"],
  "/parametrage": ["admin", "rh", "dg"],
  "/abonnement": ["admin", "rh", "dg", "comptable"],
};

/** Page d'accueil par défaut d'un rôle. */
function accueil(role: string | undefined): string {
  if (role === "super_admin") return "/admin/dashboard";
  if (role === "employe") return "/portail";
  return "/dashboard";
}

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
  const isApi = path.startsWith("/api/");

  const redirection = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // --- Non connecté -------------------------------------------------------
  if (!user) {
    // Les Route Handlers répondent en JSON : une redirection HTML y est
    // inexploitable côté client (fetch suit le 307 et reçoit du HTML).
    if (isApi && !path.startsWith("/api/inscription")) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }
    if (!isPublic && !isAdminLogin) {
      return redirection(path.startsWith("/admin") ? "/admin" : "/connexion");
    }
    return response;
  }

  // --- Connecté : le rôle fait autorité sur l'ACCÈS aux écrans ------------
  // (la RLS fait autorité sur les données ; les deux sont nécessaires)
  const { data: profil } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();
  const role = profil?.role as string | undefined;

  // Compte désactivé : plus aucun accès applicatif, session purgée.
  if (profil && profil.active === false) {
    await supabase.auth.signOut();
    if (isApi) return NextResponse.json({ error: "Compte désactivé." }, { status: 403 });
    return redirection("/connexion");
  }

  // Les Route Handlers vérifient eux-mêmes le rôle requis par l'opération.
  if (isApi) return response;

  // Déjà connecté sur une page d'authentification → son accueil.
  if (isPublic && path !== "/") return redirection(accueil(role));

  // Console plateforme : réservée au super_admin. L'accès à la console est
  // en lui-même un contrôle de sécurité, indépendamment de la RLS.
  if (path.startsWith("/admin")) {
    if (isAdminLogin) return role === "super_admin" ? redirection("/admin/dashboard") : response;
    if (role !== "super_admin") return redirection(accueil(role));
    return response;
  }

  // Le super_admin n'a pas de tenant (contrainte `super_admin_sans_tenant`) :
  // l'application cliente et le portail n'ont aucun sens pour lui.
  if (role === "super_admin") return redirection("/admin/dashboard");

  // Portail employé : ouvert à tous les rôles du tenant (chacun y voit ses
  // propres lignes), la RLS cantonne les données.
  if (path.startsWith("/portail")) return response;

  // Application cliente : le rôle `employe` n'y entre pas.
  if (role === "employe") return redirection("/portail");

  const section = Object.keys(SECTION_ROLES).find(
    (s) => path === s || path.startsWith(`${s}/`)
  );
  if (section && !SECTION_ROLES[section].includes(role ?? "")) {
    return redirection("/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
