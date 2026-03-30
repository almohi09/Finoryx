const axios = require("axios");
const { integrationConfig } = require("../config/integrations");

const MAX_INSIGHTS = 5;
const MAX_ARRAY_ITEMS = 6;
const MAX_STRING_LENGTH = 180;
const MAX_OBJECT_DEPTH = 5;

const sanitizeInsights = (insights) => {
  if (!Array.isArray(insights)) return [];

  return insights
    .slice(0, MAX_INSIGHTS)
    .map((item, index) => {
      const toneValue = String(item?.tone || "neutral").toLowerCase();
      const tone = ["warning", "positive", "neutral"].includes(toneValue) ? toneValue : "neutral";
      return {
        id: String(item?.id || `ai-${index + 1}`),
        title: String(item?.title || "Financial observation").slice(0, 120),
        tone,
        summary: String(item?.summary || "").slice(0, 400),
        action: String(item?.action || "").slice(0, 260),
      };
    })
    .filter((item) => item.title && item.summary && item.action);
};

const compactAdvisorPayload = (value, depth = 0) => {
  if (value == null) return value;
  if (depth > MAX_OBJECT_DEPTH) return undefined;

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => compactAdvisorPayload(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : value;
  }

  if (typeof value === "object") {
    const output = {};
    Object.entries(value).forEach(([key, val]) => {
      const compacted = compactAdvisorPayload(val, depth + 1);
      if (compacted !== undefined) output[key] = compacted;
    });
    return output;
  }

  return value;
};

const buildAdvisorPrompt = (summaryPayload, options = {}) => (
  ((payload) => [
    "You are a financial coaching assistant. Do not provide legal, tax, or investment guarantees.",
    "Return compact, practical guidance in JSON only.",
    "Do not invent facts. Use only values present in User summary data.",
    "Tone values allowed: warning | positive | neutral.",
    "Output schema: {\"insights\":[{\"id\":\"string\",\"title\":\"string\",\"tone\":\"warning|positive|neutral\",\"summary\":\"string\",\"action\":\"string\"}]}",
    "Keep 3 to 5 insights.",
    `Analysis scope: ${options.scope || "overall"}. Only analyze this scope's data and do not infer from missing domains.`,
    options.question ? `User question: ${options.question}` : "No direct user question provided.",
    options.question
      ? "Prioritize answering the user question first, then include additional high-impact insights."
      : "Provide best proactive insights from the available scope data.",
    "Every insight summary must include at least one concrete numeric value from the provided data.",
    "Use the full provided dataset: spending, income, bank flow, investments, goals, habits, trends, and recent records.",
    "Prioritize highest-impact issues first. Mention concrete numbers from data in each summary.",
    "Include at least one insight about long-term planning (investments/goals) when data exists.",
    "Include at least one operational next step the user can do this week.",
    `User summary data: ${JSON.stringify(payload)}`,
  ].join("\n"))(compactAdvisorPayload(summaryPayload))
);

const parseJsonResponse = (text) => {
  if (!text) return null;
  const raw = String(text || "").trim();
  const candidate = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(candidate);
    const insights = sanitizeInsights(parsed?.insights);
    return insights.length ? insights : null;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(candidate.slice(start, end + 1));
        const insights = sanitizeInsights(parsed?.insights);
        return insights.length ? insights : null;
      } catch {
        return null;
      }
    }
    return null;
  }
};

const generateOpenAiAdvisorInsights = async (summaryPayload, options = {}) => {
  if (!integrationConfig.openaiAdvisor.enabled) return null;
  const prompt = buildAdvisorPrompt(summaryPayload, options);

  const response = await axios.post(
    `${integrationConfig.openaiAdvisor.baseUrl}/responses`,
    {
      model: integrationConfig.openaiAdvisor.model,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "advisor_insights",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              insights: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    tone: { type: "string", enum: ["warning", "positive", "neutral"] },
                    summary: { type: "string" },
                    action: { type: "string" },
                  },
                  required: ["id", "title", "tone", "summary", "action"],
                },
              },
            },
            required: ["insights"],
          },
          strict: true,
        },
      },
      max_output_tokens: 500,
      temperature: 0.2,
    },
    {
      timeout: 20000,
      proxy: false,
      headers: {
        Authorization: `Bearer ${integrationConfig.openaiAdvisor.apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return parseJsonResponse(response.data?.output_text || "");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const postOpenRouterWithRetry = async (payload, headers, maxAttempts = 3) => {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios.post(
        `${integrationConfig.advisor.openrouter.baseUrl}/chat/completions`,
        payload,
        {
          timeout: 20000,
          proxy: false,
          headers,
        }
      );
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      if (![429, 502, 503, 504].includes(status) || attempt === maxAttempts) {
        throw err;
      }
      await sleep(700 * attempt);
    }
  }
  throw lastError;
};

const extractOpenRouterText = (responseData) => {
  const content = responseData?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => String(item?.text || "")).join("").trim();
  }
  return "";
};

const generateOpenRouterAdvisorInsights = async (summaryPayload, options = {}) => {
  if (!integrationConfig.advisor.openrouter?.enabled) return null;
  const prompt = buildAdvisorPrompt(summaryPayload, options);
  const headers = {
    Authorization: `Bearer ${integrationConfig.advisor.openrouter.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
    "X-Title": "Fynvester Advisor",
  };

  const response = await postOpenRouterWithRetry(
    {
      model: integrationConfig.advisor.openrouter.model,
      messages: [
        {
          role: "system",
          content: "Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 500,
    },
    headers
  );

  const contentText = extractOpenRouterText(response.data);
  const parsed = parseJsonResponse(contentText);
  if (parsed) return parsed;

  const conciseResponse = await postOpenRouterWithRetry(
    {
      model: integrationConfig.advisor.openrouter.model,
      messages: [
        {
          role: "system",
          content: "You are a practical financial coach.",
        },
        {
          role: "user",
          content: `Provide 3 short recommendations for scope "${options.scope || "overall"}"${options.question ? ` and question "${options.question}"` : ""}. Use plain text.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    },
    headers
  );

  const conciseText = extractOpenRouterText(conciseResponse.data);
  return parseJsonResponse(conciseText);
};

const extractGeminiText = (responseData) => {
  const parts = responseData?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => String(part?.text || ""))
    .join("")
    .trim();
};

const postGeminiGenerateContent = async ({ model, summaryPayload, options }) => {
  return axios.post(
    `${integrationConfig.advisor.gemini.baseUrl}/models/${model}:generateContent`,
    {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildAdvisorPrompt(summaryPayload, options),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        responseMimeType: "application/json",
      },
    },
    {
      timeout: 20000,
      proxy: false,
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        key: integrationConfig.advisor.gemini.apiKey,
      },
    }
  );
};

const generateGeminiAdvisorInsights = async (summaryPayload, options = {}) => {
  if (!integrationConfig.advisor.gemini.enabled) return null;

  const primaryModel = integrationConfig.advisor.gemini.model;
  const fallbackModels = ["gemini-2.0-flash", "gemini-flash-latest"];
  const modelCandidates = [primaryModel, ...fallbackModels.filter((m) => m !== primaryModel)];
  let response = null;
  let lastError = null;

  for (const model of modelCandidates) {
    try {
      response = await postGeminiGenerateContent({ model, summaryPayload, options });
      break;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if (status !== 404) {
        throw err;
      }
    }
  }

  if (!response && lastError) {
    throw lastError;
  }

  return parseJsonResponse(extractGeminiText(response.data));
};

const generateAdvisorInsights = async (summaryPayload, options = {}) => {
  const provider = integrationConfig.advisor.provider;

  try {
    if (provider === "gemini") {
      const insights = await generateGeminiAdvisorInsights(summaryPayload, options);
      return insights ? { insights, provider: "gemini", error: null } : { insights: null, provider: null, error: null };
    }

    if (provider === "openrouter") {
      const insights = await generateOpenRouterAdvisorInsights(summaryPayload, options);
      return insights ? { insights, provider: "openrouter", error: null } : { insights: null, provider: null, error: null };
    }

    const insights = await generateOpenAiAdvisorInsights(summaryPayload, options);
    return insights ? { insights, provider: "openai", error: null } : { insights: null, provider: null, error: null };
  } catch (err) {
    const status = err?.response?.status || "";
    const message = err?.response?.data?.error?.message || err?.message || "advisor provider error";
    console.warn(`[advisor] provider=${provider} status=${status} message=${message}`);
    return {
      insights: null,
      provider: null,
      error: {
        status: Number(status) || 0,
        message,
        isRateLimit: Number(status) === 429 || /rate limit/i.test(message),
        isBilling: Number(status) === 402 || /insufficient|payment|credits|billing/i.test(message),
      },
    };
  }

};

module.exports = { generateAdvisorInsights };
