import API from "./axios";

let inflight = null;

/**
 * Coalesce concurrent GET /tables (Dashboard sync + Tables page + Reservations)
 * into a single in-flight request per burst.
 */
export function fetchTablesCoalesced() {
  if (inflight) return inflight;
  inflight = API.get("/tables")
    .then((res) => res.data)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
