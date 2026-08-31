import type { Database } from "@/types/database";

// A diferencia de price/total, `rating` es `integer` (no `numeric`): llega
// como number de verdad tanto en el tipo generado como en runtime — sin
// trampa de PostgREST, sin necesidad de override acá.
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
