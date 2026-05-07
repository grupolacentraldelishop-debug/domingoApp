"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const eventoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(120),
  fecha_inicio: z.string().min(1),
  fecha_fin: z.string().min(1),
  lugar: z.string().max(200).optional().or(z.literal("")),
  descripcion: z.string().max(500).optional().or(z.literal("")),
});

export type EventoFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof eventoSchema>, string>>;
};

export async function createEvento(
  _prev: EventoFormState,
  formData: FormData
): Promise<EventoFormState> {
  const parsed = eventoSchema.safeParse({
    nombre: formData.get("nombre"),
    fecha_inicio: formData.get("fecha_inicio"),
    fecha_fin: formData.get("fecha_fin"),
    lugar: formData.get("lugar"),
    descripcion: formData.get("descripcion"),
  });

  if (!parsed.success) {
    const fieldErrors: EventoFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof z.infer<typeof eventoSchema>;
      fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  if (parsed.data.fecha_fin < parsed.data.fecha_inicio) {
    return { fieldErrors: { fecha_fin: "Fecha fin no puede ser antes que inicio" } };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("eventos")
    .insert({
      owner_id: user.id,
      nombre: parsed.data.nombre,
      fecha_inicio: parsed.data.fecha_inicio,
      fecha_fin: parsed.data.fecha_fin,
      lugar: parsed.data.lugar || null,
      descripcion: parsed.data.descripcion || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/eventos");
  redirect(`/eventos/${data.id}`);
}
