import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Fábrica del mock encadenable de Supabase (Fase 6.3) — el doble que se
 * INYECTA como último parámetro en cada llamada a un service (nunca
 * `vi.mock` de `lib/supabase/*`, ver restricción de esta fase). Diseño
 * deliberadamente simple: NO interpreta filtros reales (un `.eq(...)` no
 * filtra nada de verdad) — enruta únicamente por `(tabla, terminal)` hacia
 * la respuesta programada. Quien escribe el test decide qué debería
 * devolver esa combinación exacta; para verificar QUÉ se llamó (no qué
 * "debería" filtrar), usar `inserts()`/`updates()`/`upserts()`/`deletes()`/
 * `rpcCalls()`/`filterCalls()`.
 *
 * Un chain típico: `.from(tabla).select(...).eq(...).eq(...)` y luego,
 * opcionalmente, `.single()`/`.maybeSingle()` — o se `await`ea el chain
 * directo (sin terminal), como hacen todos los `insert`/`update`/`delete`
 * de este proyecto y los `select` que traen un array o un `count`. Por eso
 * el builder es "thenable" (implementa `.then()`): `await query` funciona
 * exactamente como con el cliente real de supabase-js.
 */

export type MockErrorMarker = { readonly __isMockError: true; readonly error: unknown };

/** Envuelve un error para que el mock lo devuelva como `{data: null, error}` en vez de tratarlo como el `data` de éxito — sin esto, cualquier objeto con una key `error` sería ambiguo. */
export function mockError(error: unknown): MockErrorMarker {
  return { __isMockError: true, error };
}

function isMockError(value: unknown): value is MockErrorMarker {
  return typeof value === "object" && value !== null && "__isMockError" in value;
}

/** `data` de éxito, o `mockError(...)` para simular un fallo — mismo shape para toda respuesta programable de este archivo. */
type MockValue = unknown;

type TerminalName = "select" | "single" | "maybeSingle" | "insert" | "update" | "upsert" | "delete";

type TableConfig = {
  /** Resolución de un `await query` SIN `.single()`/`.maybeSingle()` — arrays, o `null` en queries `head: true`. */
  select?: MockValue;
  single?: MockValue;
  maybeSingle?: MockValue;
  /** Acompaña a `select` cuando la query pide `{count: "exact"}` (con o sin `head: true`). */
  count?: number;
  /** Por default, insert/update/upsert/delete "tienen éxito" (`{error: null}`) — solo hace falta programarlos si el test necesita que fallen. */
  insertError?: unknown;
  updateError?: unknown;
  upsertError?: unknown;
  deleteError?: unknown;
};

type AuthMethod = "signUp" | "signInWithPassword" | "signOut" | "getUser";

type AuthConfig = Partial<Record<AuthMethod, MockValue>>;

export type MockSupabaseConfig = {
  /** Una entrada por tabla, indexada por nombre real (`"cart_items"`, `"orders"`, ...). */
  tables?: Record<string, TableConfig>;
  /** Una entrada por nombre de función, para `supabase.rpc(nombre, args)`. */
  rpc?: Record<string, MockValue>;
  /** `supabase.auth.*` — solo lo que usa `services/auth.service.ts`. */
  auth?: AuthConfig;
};

type Recorded = { table: string; op: string; payload: unknown };
type FilterCall = { table: string; method: string; args: unknown[] };

function resolveValue(value: MockValue): { data: unknown; error: unknown } {
  if (isMockError(value)) return { data: null, error: value.error };
  return { data: value ?? null, error: null };
}

class MockQueryBuilder implements PromiseLike<{ data: unknown; error: unknown; count: number | null }> {
  private op: TerminalName = "select";

  constructor(
    private readonly table: string,
    private readonly config: TableConfig | undefined,
    private readonly record: (entry: Recorded) => void,
    private readonly recordFilter: (entry: FilterCall) => void,
  ) {}

  /**
   * Filtros y modificadores: no-ops que devuelven `this` (no filtran nada
   * de verdad, ver comentario de arriba del archivo) PERO registran cada
   * llamada con sus argumentos — así un test puede verificar "¿la query
   * llamó a `.eq('category_id', X)`?" con `supabase.filterCalls(...)`, sin
   * que el mock tenga que reimplementar el motor de Postgrest.
   */
  private track(method: string, args: unknown[]): this {
    this.recordFilter({ table: this.table, method, args });
    return this;
  }

  select(columns?: string, opts?: { count?: string; head?: boolean }): this {
    this.op = "select";
    return this.track("select", [columns, opts]);
  }
  eq(...args: unknown[]): this {
    return this.track("eq", args);
  }
  neq(...args: unknown[]): this {
    return this.track("neq", args);
  }
  gte(...args: unknown[]): this {
    return this.track("gte", args);
  }
  lte(...args: unknown[]): this {
    return this.track("lte", args);
  }
  in(...args: unknown[]): this {
    return this.track("in", args);
  }
  or(...args: unknown[]): this {
    return this.track("or", args);
  }
  order(...args: unknown[]): this {
    return this.track("order", args);
  }
  range(...args: unknown[]): this {
    return this.track("range", args);
  }
  limit(...args: unknown[]): this {
    return this.track("limit", args);
  }

  // --- Escrituras: registran el payload para las funciones de introspección (updates()/inserts()/...). ---
  insert(payload: unknown): this {
    this.op = "insert";
    this.record({ table: this.table, op: "insert", payload });
    return this;
  }
  update(payload: unknown): this {
    this.op = "update";
    this.record({ table: this.table, op: "update", payload });
    return this;
  }
  upsert(payload: unknown): this {
    this.op = "upsert";
    this.record({ table: this.table, op: "upsert", payload });
    return this;
  }
  delete(): this {
    this.op = "delete";
    this.record({ table: this.table, op: "delete", payload: undefined });
    return this;
  }

  single(): Promise<{ data: unknown; error: unknown }> {
    return Promise.resolve(resolveValue(this.config?.single));
  }

  maybeSingle(): Promise<{ data: unknown; error: unknown }> {
    return Promise.resolve(resolveValue(this.config?.maybeSingle));
  }

  private resolveTerminal(): { data: unknown; error: unknown; count: number | null } {
    if (this.op === "select") {
      const { data, error } = resolveValue(this.config?.select);
      return { data, error, count: this.config?.count ?? null };
    }
    const errorKey = `${this.op}Error` as const;
    const configuredError = this.config?.[errorKey as "insertError" | "updateError" | "upsertError" | "deleteError"];
    return { data: null, error: configuredError ?? null, count: null };
  }

  // Sin `.single()`/`.maybeSingle()` explícitos, `await query` cae acá — igual que el cliente real de supabase-js.
  then<TResult1 = { data: unknown; error: unknown; count: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolveTerminal()).then(onfulfilled, onrejected);
  }
}

export type MockedSupabaseClient = SupabaseClient<Database> & {
  /** Payloads de cada `insert(...)` llamado contra `table`, en orden. */
  inserts: (table: string) => unknown[];
  /** Payloads de cada `update(...)` llamado contra `table`, en orden. */
  updates: (table: string) => unknown[];
  /** Payloads de cada `upsert(...)` llamado contra `table`, en orden. */
  upserts: (table: string) => unknown[];
  /** Una entrada por cada `delete()` llamado contra `table` (sin payload propio). */
  deletes: (table: string) => unknown[];
  /** Args de cada `rpc(nombre, args)` llamado, en orden. */
  rpcCalls: (name: string) => unknown[];
  /**
   * Args de cada llamada a un método de filtro/orden (`eq`, `gte`, `lte`,
   * `in`, `or`, `order`, `range`, `limit`, `select`) contra `table`, en
   * orden. Sin `method`, devuelve TODAS las llamadas de filtro a esa
   * tabla. Para verificar "¿los filtros construyeron la query correcta?"
   * sin que el mock reimplemente Postgrest.
   */
  filterCalls: (table: string, method?: string) => unknown[][];
};

/**
 * Construye un doble de `SupabaseClient<Database>` listo para inyectar como
 * último parámetro de cualquier función de `services/`. El cast final
 * (`as unknown as MockedSupabaseClient`) es deliberado: este objeto NO
 * implementa la superficie completa del cliente real (ni falta que le
 * hace) — implementa exactamente los métodos que los 15 services de este
 * proyecto usan, verificados leyendo cada archivo antes de escribir esto.
 */
export function mockSupabase(config: MockSupabaseConfig = {}): MockedSupabaseClient {
  const recorded: Recorded[] = [];
  const record = (entry: Recorded) => recorded.push(entry);

  const byOp = (table: string, op: string) => recorded.filter((r) => r.table === table && r.op === op).map((r) => r.payload);

  const filterCallsRecorded: FilterCall[] = [];
  const recordFilter = (entry: FilterCall) => filterCallsRecorded.push(entry);

  const rpcCallsRecorded: { name: string; args: unknown }[] = [];

  const client = {
    from(table: string) {
      return new MockQueryBuilder(table, config.tables?.[table], record, recordFilter);
    },
    rpc(name: string, args: unknown) {
      rpcCallsRecorded.push({ name, args });
      const { data, error } = resolveValue(config.rpc?.[name]);
      return Promise.resolve({ data, error });
    },
    auth: {
      signUp: () => Promise.resolve(resolveValue(config.auth?.signUp)),
      signInWithPassword: () => Promise.resolve(resolveValue(config.auth?.signInWithPassword)),
      signOut: () => Promise.resolve({ error: resolveValue(config.auth?.signOut).error }),
      getUser: () => Promise.resolve(resolveValue(config.auth?.getUser)),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    // Introspección — no existe en el cliente real, es la API propia del mock.
    inserts: (table: string) => byOp(table, "insert"),
    updates: (table: string) => byOp(table, "update"),
    upserts: (table: string) => byOp(table, "upsert"),
    deletes: (table: string) => byOp(table, "delete"),
    rpcCalls: (name: string) => rpcCallsRecorded.filter((r) => r.name === name).map((r) => r.args),
    filterCalls: (table: string, method?: string) =>
      filterCallsRecorded.filter((f) => f.table === table && (method === undefined || f.method === method)).map((f) => f.args),
  };

  return client as unknown as MockedSupabaseClient;
}
