"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { createEvento, type EventoFormState } from "@/app/actions/eventos";

const initial: EventoFormState = {};

export function EventoForm() {
  const [state, action] = useFormState(createEvento, initial);

  return (
    <form action={action} className="card space-y-4">
      <Field
        name="nombre"
        label="Nombre"
        placeholder="Pop-Up #5 — Verano"
        required
        error={state.fieldErrors?.nombre}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          name="fecha_inicio"
          label="Inicio"
          type="date"
          required
          error={state.fieldErrors?.fecha_inicio}
        />
        <Field
          name="fecha_fin"
          label="Fin"
          type="date"
          required
          error={state.fieldErrors?.fecha_fin}
        />
      </div>
      <Field
        name="lugar"
        label="Lugar"
        placeholder="La Central, Plaza Navona"
        error={state.fieldErrors?.lugar}
      />
      <div>
        <label className="label" htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          className="input h-auto py-2 mt-1"
          placeholder="Notas internas (horario, contexto…)"
        />
      </div>

      {state.error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded px-3 py-2">
          {state.error}
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}

function Field({
  name, label, type = "text", required, placeholder, error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="input mt-1"
      />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      Crear evento
    </button>
  );
}
