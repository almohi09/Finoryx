const axios = require("axios");
const { integrationConfig } = require("../config/integrations");

const createAlpacaClient = (baseURL) =>
  axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      "APCA-API-KEY-ID": integrationConfig.alpaca.apiKey,
      "APCA-API-SECRET-KEY": integrationConfig.alpaca.secretKey,
      "Content-Type": "application/json",
    },
  });

const checkConfigured = () => {
  if (!integrationConfig.alpaca.enabled) {
    const err = new Error("Alpaca integration is not configured");
    err.statusCode = 503;
    throw err;
  }
};

const getTradingClient = () => {
  checkConfigured();
  return createAlpacaClient(integrationConfig.alpaca.baseUrl);
};

const getAccount = async () => {
  const client = getTradingClient();
  const response = await client.get("/v2/account");
  return response.data;
};

const getPositions = async () => {
  const client = getTradingClient();
  const response = await client.get("/v2/positions");
  return Array.isArray(response.data) ? response.data : [];
};

const submitOrder = async ({
  symbol,
  side,
  qty,
  notional,
  type = "market",
  timeInForce = integrationConfig.alpaca.defaultTimeInForce || "day",
  clientOrderId,
}) => {
  const client = getTradingClient();
  const payload = {
    symbol: String(symbol).toUpperCase(),
    side: String(side).toLowerCase(),
    type,
    time_in_force: timeInForce,
  };

  if (qty) {
    payload.qty = String(qty);
  } else if (notional) {
    payload.notional = String(notional);
  } else {
    const err = new Error("Either qty or notional is required to submit order");
    err.statusCode = 400;
    throw err;
  }

  if (clientOrderId) {
    payload.client_order_id = clientOrderId;
  }

  const response = await client.post("/v2/orders", payload);
  return response.data;
};

module.exports = {
  getAccount,
  getPositions,
  submitOrder,
};
