const axios = require("axios");
const { integrationConfig } = require("../config/integrations");

const PLAID_BASE_URLS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

const plaidBaseUrl = PLAID_BASE_URLS[integrationConfig.plaid.environment] || PLAID_BASE_URLS.sandbox;

const plaidRequest = async (path, body = {}) => {
  if (!integrationConfig.plaid.enabled) {
    const err = new Error("Plaid integration is not configured");
    err.statusCode = 503;
    throw err;
  }

  const payload = {
    client_id: integrationConfig.plaid.clientId,
    secret: integrationConfig.plaid.secret,
    ...body,
  };

  const response = await axios.post(`${plaidBaseUrl}${path}`, payload, {
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
  });

  return response.data;
};

const createLinkToken = async ({ userId, clientName = "Fynorix" }) => {
  const products = integrationConfig.plaid.products.length ? integrationConfig.plaid.products : ["transactions"];
  const body = {
    client_name: clientName,
    language: "en",
    country_codes: integrationConfig.plaid.countryCodes.length ? integrationConfig.plaid.countryCodes : ["US"],
    user: { client_user_id: String(userId) },
    products,
  };

  if (integrationConfig.plaid.redirectUri) {
    body.redirect_uri = integrationConfig.plaid.redirectUri;
  }

  if (integrationConfig.plaid.webhookUrl) {
    body.webhook = integrationConfig.plaid.webhookUrl;
  }

  return plaidRequest("/link/token/create", body);
};

const exchangePublicToken = async (publicToken) => {
  return plaidRequest("/item/public_token/exchange", { public_token: publicToken });
};

const getAccounts = async (accessToken) => {
  const data = await plaidRequest("/accounts/get", { access_token: accessToken });
  return data.accounts || [];
};

const syncTransactions = async ({ accessToken, cursor = "" }) => {
  let hasMore = true;
  let nextCursor = cursor || "";
  const added = [];
  const modified = [];
  const removed = [];

  while (hasMore) {
    const data = await plaidRequest("/transactions/sync", {
      access_token: accessToken,
      cursor: nextCursor || undefined,
      options: { include_original_description: true },
    });

    nextCursor = data.next_cursor || nextCursor;
    hasMore = Boolean(data.has_more);

    if (Array.isArray(data.added)) added.push(...data.added);
    if (Array.isArray(data.modified)) modified.push(...data.modified);
    if (Array.isArray(data.removed)) removed.push(...data.removed);
  }

  return { added, modified, removed, nextCursor };
};

const searchInstitutions = async (query, limit = 10) => {
  const q = String(query || "").trim();
  if (!q) return [];

  const data = await plaidRequest("/institutions/search", {
    query: q,
    products: integrationConfig.plaid.products.length ? integrationConfig.plaid.products : ["transactions"],
    country_codes: integrationConfig.plaid.countryCodes.length ? integrationConfig.plaid.countryCodes : ["US"],
    options: {
      include_optional_metadata: true,
      limit: Math.max(1, Math.min(Number(limit) || 10, 25)),
    },
  });

  const institutions = Array.isArray(data.institutions) ? data.institutions : [];
  return institutions.map((item) => ({
    institutionId: item.institution_id,
    name: item.name,
    primaryColor: item.primary_color || "",
    url: item.url || "",
    logo: item.logo || "",
  }));
};

module.exports = {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  syncTransactions,
  searchInstitutions,
};
