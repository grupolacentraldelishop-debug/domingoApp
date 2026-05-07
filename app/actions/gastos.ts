"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const GastoSchema = z.object({
  concepto: z.string().min(1, "El concepto es requerido").max(200),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export type GastoFormValues = z.infer<typeof GastoSchema>;

function revalidate(eventoId: string) {
  revalidatePath(`/eventos/${eventoId}/reportes`);
}

export async function createGasto(eventoId: string, values: GastoFormValues) {
  const supabase = createClient();
  const parsed = GastoSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const { error } = await supabase.from("gastos").insert({
    ...parsed.data,
    evento_id: eventoId,
  });

  if (error) return { error: error.message };
  revalidate(eventoId);
  return { success: true };
}

export async function deleteGasto(id: string, eventoId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate(eventoId);
  return { success: true };
}
