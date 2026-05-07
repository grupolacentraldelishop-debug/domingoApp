import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Cliente para Client Components ("use client").
// La anon key es pública y va al bundle del navegador.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
