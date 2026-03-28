const axios = require("axios");
const { integrationConfig } = require("../config/integrations");

const MAX_INSIGHTS = 5;

const checkConfigured = () => {
  if (!integrationConfig.openaiAdvisor.enabled) {
    return false;
  }
  return true;
};

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

const generateAdvisorInsights = async (summaryPayload) => {
  if (!checkConfigured()) {
    return null;
  }

  const prompt = [
    "You are a financial coaching assistant. Do not provide legal, tax, or investment guarantees.",
    "Return compact, practical guidance in JSON only.",
    "Tone values allowed: warning | positive | neutral.",
    "Output schema: {\"insights\":[{\"id\":\"string\",\"title\":\"string\",\"tone\":\"warning|positive|neutral\",\"summary\":\"string\",\"action\":\"string\"}]}",
    "Keep 3 to 5 insights. Focus on cash flow, spending concentration, liquidity buffer, and investing behavior.",
    `User summary data: ${JSON.stringify(summaryPayload)}`,
  ].join("\n");

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
      headers: {
        Authorization: `Bearer ${integrationConfig.openaiAdvisor.apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const outputText = response.data?.output_text || "";
  if (!outputText) return null;

  try {
    const parsed = JSON.parse(outputText);
    const insights = sanitizeInsights(parsed?.insights);
    return insights.length ? insights : null;
  } catch {
    return null;
  }
};

module.exports = { generateAdvisorInsights };
