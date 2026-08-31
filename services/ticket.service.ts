import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SupportTicket } from "@/types/ticket";
import type { TicketStatus } from "@/lib/constants/roles";

type Client = SupabaseClient<Database>;

type SupportTicketRow = Database["public"]["Tables"]["support_tickets"]["Row"];

function mapTicketRow(row: SupportTicketRow): SupportTicket {
  return { ...row, status: row.status as TicketStatus };
}

/**
 * Tickets del usuario para "Mis tickets" (decisión 5, Fase 4.7). Solo
 * lectura: crear tickets por la UI llega con el agente de la sesión 8, así
 * que este archivo no tiene (ni necesita) un `insert`.
 *
 * `userId` se pasa explícito y se filtra con `.eq` aunque
 * `support_tickets_select_own_or_admin` ya autorice la fila — mismo
 * patrón que `listMyOrders`: sin el filtro, un admin vería TODOS los
 * tickets acá donde la pantalla pide "los míos".
 */
export async function listMine(userId: string, supabase: Client = createClient()): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as SupportTicketRow[]).map(mapTicketRow);
}
