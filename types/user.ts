import type { Database } from "@/types/database";
import type { Role } from "@/lib/constants/roles";

/**
 * Fila de `profiles`. Ver decisión 8 de `MercadoTech_sesion3.md`: por RLS
 * (`profiles_select_own_or_admin`), solo se puede leer el propio profile o,
 * si sos admin, cualquiera — nunca el de otro usuario cualquiera. La UI
 * nunca debe asumir que puede resolver el nombre de un tercero a partir de
 * este tipo.
 */
export type Profile = Omit<
  Database["public"]["Tables"]["profiles"]["Row"],
  "role"
> & {
  role: Role;
};
