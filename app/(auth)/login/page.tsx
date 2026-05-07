"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/eventos";

  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setError(error.message);
      else setMagicSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.replace(next);
    }
    setLoading(false);
  }

  if (magicSent) {
    return (
      <div className="card text-center">
        <Mail className="w-8 h-8 mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl mb-2">Revisa tu correo</h2>
        <p className="text-sm text-ink-muted">
          Te enviamos un enlace mágico a <strong>{email}</strong>. Ábrelo desde el mismo dispositivo para iniciar sesión.
        </p>
        <button
          onClick={() => setMagicSent(false)}
          className="mt-4 text-sm text-rose-600 hover:underline"
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-xl">Iniciar sesión</h2>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`flex-1 h-9 rounded transition-colors ${
            mode === "magic" ? "bg-ink text-cream-50" : "bg-cream-100 text-ink-muted"
          }`}
        >
          Enlace mágico
        </button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 h-9 rounded transition-colors ${
            mode === "password" ? "bg-ink text-cream-50" : "bg-cream-100 text-ink-muted"
          }`}
        >
          Contraseña
        </button>
      </div>

      <div>
        <label className="label" htmlFor="email">Correo</label>
        <div className="relative mt-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pl-10"
            placeholder="tu@email.com"
          />
        </div>
      </div>

      {mode === "password" && (
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10"
              placeholder="••••••••"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded px-3 py-2">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {mode === "magic" ? "Enviar enlace" : "Entrar"}
      </button>

      <p className="text-center text-sm text-ink-muted">
        ¿Primera vez?{" "}
        <Link href="/signup" className="text-rose-600 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
