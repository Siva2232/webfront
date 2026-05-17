import API from "./axios";

let inflight = null;

/** Normalize GET /tables (legacy array or { tables, categories }). */
export function parseTablesPayload(data) {
  if (Array.isArray(data)) {
    return { tables: data, categories: [] };
  }
  return {
    tables: Array.isArray(data?.tables) ? data.tables : [],
    categories: Array.isArray(data?.categories) ? data.categories : [],
  };
}

/**
 * Coalesce concurrent GET /tables (Dashboard sync + Tables page + Reservations)
 * into a single in-flight request per burst.
 */
export function fetchTablesCoalesced() {
  if (inflight) return inflight;
  inflight = API.get("/tables")
    .then((res) => parseTablesPayload(res.data))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
