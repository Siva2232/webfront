import API from "../../api/axios";

export async function generatePairingCode() {
  const { data } = await API.post("/connector/pairing-code");
  return data;
}

export async function fetchConnectors(restaurantId) {
  const rid = String(restaurantId || "").toUpperCase().trim();
  const { data } = await API.get(`/connectors/${rid}`);
  return data;
}

export async function revokeConnector(connectorId) {
  const { data } = await API.delete(`/connectors/${connectorId}`);
  return data;
}
