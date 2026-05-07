"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ExpositorSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100),
  tiene_iva: z.boolean(),
  comision_dominga: z.number().min(0).max(100),
  fee_participacion: z.number().min(0),
  pago_envio: z.number().min(0),
  estado: z.enum(["pendiente", "confirmado", "pagado"]),
  notas: z.string().max(500).optional().nullable(),
});

export type ExpositorFormValues = z.infer<typeof ExpositorSchema>;

export async function createExpositor(eventoId: string, values: ExpositorFormValues) {
  const supabase = createClient();
  const parsed = ExpositorSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const { error } = await supabase.from("expositores").insert({
    ...parsed.data,
    evento_id: eventoId,
  });

  if (error) return { error: error.message };
  revalidatePath(`/eventos/${eventoId}/expositores`);
  return { success: true };
}

export async function updateExpositor(
  id: string,
  eventoId: string,
  values: ExpositorFormValues
) {
  const supabase = createClient();
  const parsed = ExpositorSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const { error } = await supabase
    .from("expositores")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/eventos/${eventoId}/expositores`);
  return { success: true };
}

export async function deleteExpositor(id: string, eventoId: string) {
  const supabase = createClient();

  const { count } = await supabase
    .from("ventas")
    .select("id", { count: "exact", head: true })
    .eq("expositor_id", id);

  if (count && count > 0) {
    return {
      error: `Esta marca tiene ${count} ${count === 1 ? "venta registrada" : "ventas registradas"} y no puede eliminarse. Puedes cambiar su estado a "inactiva".`,
    };
  }

  const { error } = await supabase.from("expositores").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/eventos/${eventoId}/expositores`);
  return { success: true };
}
