import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Maneja el callback de magic link / confirmación de email.
// Supabase redirige aquí con ?code=..., intercambiamos por una sesión y redirigimos.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/eventos";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Algo falló: redirigir a login con mensaje
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
