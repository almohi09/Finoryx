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

let assetCache = {
  at: 0,
  list: [],
};

const ASSET_CACHE_TTL_MS = 10 * 60 * 1000;

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

const normalizeAssetType = (alpacaClass = "", alpacaType = "") => {
  const assetClass = String(alpacaClass || "").toLowerCase();
  const assetType = String(alpacaType || "").toLowerCase();

  if (assetClass === "crypto") return "crypto";
  if (assetType === "etf") return "etf";
  if (assetType === "bond") return "bond";
  return "stock";
};

const getActiveAssets = async () => {
  const now = Date.now();
  if (assetCache.list.length && now - assetCache.at < ASSET_CACHE_TTL_MS) {
    return assetCache.list;
  }

  const client = getTradingClient();
  const response = await client.get("/v2/assets", {
    params: {
      status: "active",
      asset_class: "us_equity",
    },
  });

  const list = Array.isArray(response.data) ? response.data : [];
  assetCache = { at: now, list };
  return list;
};

const searchAssets = async (query, limit = 15) => {
  const q = String(query || "").trim().toUpperCase();
  if (!q) return [];

  const assets = await getActiveAssets();
  const startsWith = [];
  const includes = [];

  for (const item of assets) {
    if (!item?.symbol || item.tradable !== true) continue;
    const symbol = String(item.symbol).toUpperCase();
    const name = String(item.name || "").toUpperCase();

    const matchStarts = symbol.startsWith(q) || name.startsWith(q);
    const matchIncludes = symbol.includes(q) || name.includes(q);
    if (!matchStarts && !matchIncludes) continue;

    const mapped = {
      symbol: symbol,
      name: item.name || symbol,
      assetType: normalizeAssetType(item.class, item.type),
      exchange: item.exchange || "",
      tradable: Boolean(item.tradable),
    };

    if (matchStarts) startsWith.push(mapped);
    else includes.push(mapped);
  }

  return [...startsWith, ...includes].slice(0, Math.max(1, Math.min(limit, 30)));
};

module.exports = {
  getAccount,
  getPositions,
  submitOrder,
  searchAssets,
};
