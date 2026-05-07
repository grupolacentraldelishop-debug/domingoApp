"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface BoletaItem {
  producto_id: string;
  cantidad: number;
}

export interface RegistrarBoletaArgs {
  eventoId: string;
  metodoPago: string;
  cliente: string | null;
  pideFactura: boolean;
  clienteIdentificacion: string | null;
  clienteRazonSocial: string | null;
  clienteEmail: string | null;
  clienteDireccion: string | null;
  clienteTelefono: string | null;
  items: BoletaItem[];
}

export async function registrarBoleta(args: RegistrarBoletaArgs) {
  if (args.items.length === 0) return { error: "Agrega al menos un producto" };

  const supabase = createClient();

  const { data, error } = await supabase.rpc("registrar_boleta", {
    p_evento_id: args.eventoId,
    p_metodo_pago: args.metodoPago,
    p_cliente: args.cliente,
    p_pide_factura: args.pideFactura,
    p_cliente_identificacion: args.clienteIdentificacion,
    p_cliente_razon_social: args.clienteRazonSocial,
    p_cliente_email: args.clienteEmail,
    p_cliente_direccion: args.clienteDireccion,
    p_cliente_telefono: args.clienteTelefono,
    p_items: args.items as unknown as import("@/lib/supabase/types").Json,
  });

  if (error) return { error: error.message };
  revalidatePath(`/eventos/${args.eventoId}/ventas`);
  revalidatePath(`/eventos/${args.eventoId}`);
  return { success: true, boletaId: data as string };
}

export async function anularBoleta(boletaId: string, eventoId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("anular_boleta", { p_boleta_id: boletaId });
  if (error) return { error: error.message };
  revalidatePath(`/eventos/${eventoId}/ventas`);
  revalidatePath(`/eventos/${eventoId}`);
  return { success: true };
}
