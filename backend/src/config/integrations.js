const required = (value) => typeof value === "string" && value.trim().length > 0;
const missingEnvKeys = (keys = []) => keys.filter((key) => !required(process.env[key]));

const normalizePlaidEnv = (value = "sandbox") => {
  const env = String(value || "sandbox").trim().toLowerCase();
  return ["sandbox", "development", "production"].includes(env) ? env : "sandbox";
};

const normalizeOpenAiBaseUrl = (value) => {
  const base = String(value || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  return base || "https://api.openai.com/v1";
};

const normalizeAdvisorProvider = (value) => {
  const provider = String(value || "").trim().toLowerCase();
  if (["openai", "gemini", "openrouter"].includes(provider)) {
    return provider;
  }
  return "openai";
};

const normalizeGeminiBaseUrl = (value) => {
  const base = String(value || "https://generativelanguage.googleapis.com/v1beta").trim().replace(/\/+$/, "");
  return base || "https://generativelanguage.googleapis.com/v1beta";
};

const normalizeGeminiModel = (value) => {
  const model = String(value || "gemini-2.0-flash").trim();
  return model.replace(/^models\//i, "") || "gemini-2.0-flash";
};

const normalizeOpenRouterBaseUrl = (value) => {
  const base = String(value || "https://openrouter.ai/api/v1").trim().replace(/\/+$/, "");
  return base || "https://openrouter.ai/api/v1";
};

const normalizeAlpacaBaseUrl = (value) => {
  const base = String(value || "https://paper-api.alpaca.markets").trim().replace(/\/+$/, "");
  return base.replace(/\/v2$/i, "");
};

const integrationConfig = {
  appEncryptionKey: process.env.APP_ENCRYPTION_KEY || "",
  plaid: {
    missingEnv: missingEnvKeys(["PLAID_CLIENT_ID", "PLAID_SECRET"]),
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
  advisor: {
    provider: normalizeAdvisorProvider(process.env.ADVISOR_PROVIDER),
    gemini: {
      enabled: required(process.env.GEMINI_API_KEY),
      apiKey: process.env.GEMINI_API_KEY || "",
      model: normalizeGeminiModel(process.env.GEMINI_ADVISOR_MODEL || "gemini-2.0-flash"),
      baseUrl: normalizeGeminiBaseUrl(process.env.GEMINI_BASE_URL),
    },
    openrouter: {
      enabled: required(process.env.OPENROUTER_API_KEY),
      apiKey: process.env.OPENROUTER_API_KEY || "",
      model: String(process.env.OPENROUTER_ADVISOR_MODEL || "openrouter/free").trim(),
      baseUrl: normalizeOpenRouterBaseUrl(process.env.OPENROUTER_BASE_URL),
    },
  },
};

module.exports = { integrationConfig };
