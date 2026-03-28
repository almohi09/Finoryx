const required = (value) => typeof value === "string" && value.trim().length > 0;

const normalizePlaidEnv = (value = "sandbox") => {
  const env = String(value || "sandbox").trim().toLowerCase();
  return ["sandbox", "development", "production"].includes(env) ? env : "sandbox";
};

const normalizeOpenAiBaseUrl = (value) => {
  const base = String(value || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  return base || "https://api.openai.com/v1";
};

const normalizeAlpacaBaseUrl = (value) => {
  const base = String(value || "https://paper-api.alpaca.markets").trim().replace(/\/+$/, "");
  return base.replace(/\/v2$/i, "");
};

const integrationConfig = {
  appEncryptionKey: process.env.APP_ENCRYPTION_KEY || "",
  plaid: {
    enabled: required(process.env.PLAID_CLIENT_ID) && required(process.env.PLAID_SECRET),
    clientId: process.env.PLAID_CLIENT_ID || "",
    secret: process.env.PLAID_SECRET || "",
    environment: normalizePlaidEnv(process.env.PLAID_ENV),
    products: (process.env.PLAID_PRODUCTS || "transactions")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    countryCodes: (process.env.PLAID_COUNTRY_CODES || "US")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean),
    redirectUri: process.env.PLAID_REDIRECT_URI || "",
    webhookUrl: process.env.PLAID_WEBHOOK_URL || "",
  },
  alpaca: {
    enabled: required(process.env.ALPACA_API_KEY) && required(process.env.ALPACA_SECRET_KEY),
    apiKey: process.env.ALPACA_API_KEY || "",
    secretKey: process.env.ALPACA_SECRET_KEY || "",
    baseUrl: normalizeAlpacaBaseUrl(process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets"),
    dataUrl: (process.env.ALPACA_DATA_URL || "https://data.alpaca.markets").trim().replace(/\/+$/, ""),
    defaultTimeInForce: (process.env.ALPACA_DEFAULT_TIF || "day").trim().toLowerCase(),
  },
  openaiAdvisor: {
    enabled: required(process.env.OPENAI_API_KEY),
    apiKey: process.env.OPENAI_API_KEY || "",
    model: (process.env.OPENAI_ADVISOR_MODEL || "gpt-4.1-mini").trim(),
    baseUrl: normalizeOpenAiBaseUrl(process.env.OPENAI_BASE_URL),
  },
};

module.exports = { integrationConfig };
