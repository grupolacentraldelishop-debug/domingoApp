"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/eventos`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Si Supabase tiene email confirmation activado, no hay sesión todavía
    if (!data.session) {
      setConfirmSent(true);
    } else {
      router.replace("/eventos");
    }
  }

  if (confirmSent) {
    return (
      <div className="card text-center">
        <Mail className="w-8 h-8 mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl mb-2">Confirma tu correo</h2>
        <p className="text-sm text-ink-muted">
          Te enviamos un enlace de confirmación a <strong>{email}</strong>. Ábrelo y volverás directo al dashboard.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-xl">Crear cuenta</h2>

      <div>
        <label className="label" htmlFor="nombre">Nombre</label>
        <div className="relative mt-1">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
          <input
            id="nombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input pl-10"
            placeholder="Doménica"
          />
        </div>
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

      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <div className="relative mt-1">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pl-10"
            placeholder="Mínimo 6 caracteres"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded px-3 py-2">{error}</p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Crear cuenta
      </button>

      <p className="text-center text-sm text-ink-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-rose-600 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
