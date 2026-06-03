// Generado con `mcp generate_typescript_types` desde el schema de Supabase.
// Regenerar tras cada migración: regenera con el MCP o `supabase gen types typescript`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      boletas: {
        Row: {
          cliente: string
          cliente_direccion: string | null
          cliente_email: string | null
          cliente_identificacion: string | null
          cliente_razon_social: string | null
          cliente_telefono: string | null
          estado: string
          evento_id: string
          fecha: string
          id: string
          metodo_pago: string
          pide_factura: boolean
          registrado_por: string | null
          total_dominga: number
          total_marca: number
          total_pvp: number
        }
        Insert: {
          cliente?: string
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_identificacion?: string | null
          cliente_razon_social?: string | null
          cliente_telefono?: string | null
          estado?: string
          evento_id: string
          fecha?: string
          id?: string
          metodo_pago: string
          pide_factura?: boolean
          registrado_por?: string | null
          total_dominga?: number
          total_marca?: number
          total_pvp?: number
        }
        Update: {
          cliente?: string
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_identificacion?: string | null
          cliente_razon_social?: string | null
          cliente_telefono?: string | null
          estado?: string | null
          evento_id?: string
          fecha?: string
          id?: string
          metodo_pago?: string
          pide_factura?: boolean
          registrado_por?: string | null
          total_dominga?: number
          total_marca?: number
          total_pvp?: number
        }
        Relationships: [
          {
            foreignKeyName: "boletas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_colaboradores: {
        Row: {
          accepted_at: string | null
          evento_id: string
          invited_at: string
          profile_id: string
        }
        Insert: {
          accepted_at?: string | null
          evento_id: string
          invited_at?: string
          profile_id: string
        }
        Update: {
          accepted_at?: string | null
          evento_id?: string
          invited_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_colaboradores_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_colaboradores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          lugar: string | null
          nombre: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          lugar?: string | null
          nombre: string
          owner_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          lugar?: string | null
          nombre?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expositores: {
        Row: {
          comision_dominga: number
          created_at: string
          estado: string
          evento_id: string
          fee_participacion: number
          id: string
          nombre: string
          notas: string | null
          pago_envio: number
          tiene_iva: boolean
        }
        Insert: {
          comision_dominga?: number
          created_at?: string
          estado?: string
          evento_id: string
          fee_participacion?: number
          id?: string
          nombre: string
          notas?: string | null
          pago_envio?: number
          tiene_iva?: boolean
        }
        Update: {
          comision_dominga?: number
          created_at?: string
          estado?: string
          evento_id?: string
          fee_participacion?: number
          id?: string
          nombre?: string
          notas?: string | null
          pago_envio?: number
          tiene_iva?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "expositores_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          concepto: string
          created_at: string
          evento_id: string
          fecha: string
          id: string
          monto: number
        }
        Insert: {
          concepto: string
          created_at?: string
          evento_id: string
          fecha?: string
          id?: string
          monto: number
        }
        Update: {
          concepto?: string
          created_at?: string
          evento_id?: string
          fecha?: string
          id?: string
          monto?: number
        }
        Relationships: [
          {
            foreignKeyName: "gastos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          cantidad: number
          codigo: string | null
          created_at: string
          descripcion: string
          expositor_id: string
          id: string
          iva_unitario: number | null
          margen_dominga: number | null
          margen_marca: number | null
          precio_base: number | null
          pvp: number
          vendidos: number
        }
        Insert: {
          cantidad?: number
          codigo?: string | null
          created_at?: string
          descripcion: string
          expositor_id: string
          id?: string
          iva_unitario?: number | null
          margen_dominga?: number | null
          margen_marca?: number | null
          precio_base?: number | null
          pvp: number
          vendidos?: number
        }
        Update: {
          cantidad?: number
          codigo?: string | null
          created_at?: string
          descripcion?: string
          expositor_id?: string
          id?: string
          iva_unitario?: number | null
          margen_dominga?: number | null
          margen_marca?: number | null
          precio_base?: number | null
          pvp?: number
          vendidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "productos_expositor_id_fkey"
            columns: ["expositor_id"]
            isOneToOne: false
            referencedRelation: "expositores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nombre: string
          rol: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nombre: string
          rol?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          rol?: string
        }
        Relationships: []
      }
      ventas: {
        Row: {
          boleta_id: string
          cantidad: number
          created_at: string
          descripcion: string
          evento_id: string
          expositor_id: string
          id: string
          margen_dominga: number
          margen_dominga_unitario: number
          margen_marca: number
          margen_marca_unitario: number
          producto_id: string
          pvp: number
          pvp_unitario: number
        }
        Insert: {
          boleta_id: string
          cantidad?: number
          created_at?: string
          descripcion: string
          evento_id: string
          expositor_id: string
          id?: string
          margen_dominga: number
          margen_dominga_unitario: number
          margen_marca: number
          margen_marca_unitario: number
          producto_id: string
          pvp: number
          pvp_unitario: number
        }
        Update: {
          boleta_id?: string
          cantidad?: number
          created_at?: string
          descripcion?: string
          evento_id?: string
          expositor_id?: string
          id?: string
          margen_dominga?: number
          margen_dominga_unitario?: number
          margen_marca?: number
          margen_marca_unitario?: number
          producto_id?: string
          pvp?: number
          pvp_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_boleta_id_fkey"
            columns: ["boleta_id"]
            isOneToOne: false
            referencedRelation: "boletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_expositor_id_fkey"
            columns: ["expositor_id"]
            isOneToOne: false
            referencedRelation: "expositores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      liquidacion_marca: {
        Row: {
          balance_real: number | null
          comision_dominga: number | null
          estado: string | null
          evento_id: string | null
          expositor_id: string | null
          fee_participacion: number | null
          nombre: string | null
          pago_envio: number | null
          tiene_iva: boolean | null
          total_margen_dominga: number | null
          total_margen_marca: number | null
          total_ventas: number | null
          valor_a_transferir: number | null
        }
        Relationships: []
      }
      ventas_con_datos_facturacion: {
        Row: {
          boleta_id: string | null
          cliente_direccion: string | null
          cliente_email: string | null
          cliente_identificacion: string | null
          cliente_razon_social: string | null
          cliente_telefono: string | null
          evento_id: string | null
          fecha: string | null
          items: Json | null
          metodo_pago: string | null
          total_pvp: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      anular_boleta: { Args: { p_boleta_id: string }; Returns: undefined }
      is_collaborator_of: { Args: { p_evento_id: string }; Returns: boolean }
      is_owner_of: { Args: { p_evento_id: string }; Returns: boolean }
      registrar_boleta: {
        Args: {
          p_cliente: string | null
          p_cliente_direccion: string | null
          p_cliente_email: string | null
          p_cliente_identificacion: string | null
          p_cliente_razon_social: string | null
          p_cliente_telefono: string | null
          p_evento_id: string
          p_items: Json
          p_metodo_pago: string
          p_pide_factura: boolean
        }
        Returns: string
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Aliases convenientes
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type Update<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]
