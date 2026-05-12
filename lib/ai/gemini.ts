import {
  AI_BRIEF_FALLBACK_CACHE_TTL_MS,
  AI_BRIEF_CACHE_TTL_MS,
  createBriefCacheKey,
  getCachedBrief,
  getCacheTtlSeconds,
  setCachedBrief,
} from "./brief-cache";

export type NarrativeBriefInput = {
  basis: string[];
  confidence: number;
  generatedWeights: Array<{
    asset: string;
    weight: number;
  }>;
  risk: string;
  signalScore: number;
  sourceLabels: string[];
  summary: string;
  title: string;
  narrativeId?: string;
  topAssets: string[];
};

export type NarrativeBrief = {
  executiveSummary: string;
  whyNow: string[];
  bullCase: string[];
  bearCase: string[];
  indexThesis: string;
  riskNotes: string[];
  suggestedNextStep: string;
};

export type NarrativeBriefResult = {
  source: "gemini" | "cache" | "fallback";
  cached: boolean;
  cacheTtlSeconds?: number;
  brief: NarrativeBrief;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function fallbackBrief(input: NarrativeBriefInput): NarrativeBrief {
  const basket =
    input.generatedWeights.length > 0
      ? input.generatedWeights
          .map((asset) => `${asset.asset} ${asset.weight}%`)
          .join(", ")
      : input.topAssets.join(", ");

  return {
    executiveSummary: `${input.title} is a SoNarr narrative brief generated from the available SoSoValue-powered evidence. The current signal score is ${input.signalScore}/100 with ${input.confidence}/100 confidence.`,
    whyNow: [
      input.summary,
      input.basis[0] ?? "The narrative has limited available evidence right now.",
    ],
    bullCase: [
      "Narrative attention is visible in the provided evidence.",
      "Related assets can be organized into a transparent index idea for further review.",
    ],
    bearCase: [
      "Evidence may be early, incomplete, or concentrated in a small set of signals.",
      "Narrative momentum can fade quickly if follow-through data weakens.",
    ],
    indexThesis: `A possible index thesis is to track ${input.title} through a basket of ${basket}. This is a research workflow, not financial advice.`,
    riskNotes: [
      `Current risk posture: ${input.risk}.`,
      "No returns are guaranteed and no trade is placed automatically.",
    ],
    suggestedNextStep:
      "Review the evidence, check the Signal Stack, and decide whether this narrative is ready for a public index page preview.",
  };
}

function cleanJsonText(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : undefined;
}

function parseBrief(value: unknown): NarrativeBrief | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const executiveSummary = record.executiveSummary;
  const indexThesis = record.indexThesis;
  const suggestedNextStep = record.suggestedNextStep;
  const whyNow = asStringArray(record.whyNow);
  const bullCase = asStringArray(record.bullCase);
  const bearCase = asStringArray(record.bearCase);
  const riskNotes = asStringArray(record.riskNotes);

  if (
    typeof executiveSummary !== "string" ||
    typeof indexThesis !== "string" ||
    typeof suggestedNextStep !== "string" ||
    !whyNow ||
    !bullCase ||
    !bearCase ||
    !riskNotes
  ) {
    return undefined;
  }

  return {
    executiveSummary,
    whyNow,
    bullCase,
    bearCase,
    indexThesis,
    riskNotes,
    suggestedNextStep,
  };
}

function getGeminiText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text): text is string => Boolean(text))
    .join("");
}

function buildPrompt(input: NarrativeBriefInput) {
  return `You are SoNarr's narrative synthesis layer.

Your job:
Turn provided SoSoValue-powered evidence and deterministic SoNarr narrative data into a concise finance-ready narrative brief.

Hard rules:
- Do not invent facts.
- Use only provided evidence.
- Do not provide financial advice.
- Do not guarantee returns.
- Do not invent prices, scores, assets, or evidence.
- If evidence is weak, say so.
- Keep output concise and structured.
- Return only valid JSON with this exact shape:
{
  "executiveSummary": "string",
  "whyNow": ["string"],
  "bullCase": ["string"],
  "bearCase": ["string"],
  "indexThesis": "string",
  "riskNotes": ["string"],
  "suggestedNextStep": "string"
}

Input:
${JSON.stringify(input, null, 2)}`;
}

export async function generateNarrativeBrief(
  input: NarrativeBriefInput,
  options: { forceRefresh?: boolean } = {},
): Promise<NarrativeBriefResult> {
  const cacheKey = createBriefCacheKey(input);
  const cachedBrief = options.forceRefresh ? undefined : getCachedBrief(cacheKey);

  if (cachedBrief) {
    return {
      source: "cache",
      cached: true,
      cacheTtlSeconds: getCacheTtlSeconds(cachedBrief),
      brief: cachedBrief.brief,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const cached = setCachedBrief(
      cacheKey,
      {
        source: "fallback",
        brief: fallbackBrief(input),
      },
      AI_BRIEF_FALLBACK_CACHE_TTL_MS,
    );

    return {
      source: "fallback",
      cached: false,
      cacheTtlSeconds: getCacheTtlSeconds(cached),
      brief: cached.brief,
    };
  }

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(input) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = getGeminiText(payload);
    if (!text) {
      throw new Error("Gemini response did not include text.");
    }

    const parsed = parseBrief(JSON.parse(cleanJsonText(text)));
    if (!parsed) {
      throw new Error("Gemini response did not match the expected brief schema.");
    }

    const cached = setCachedBrief(cacheKey, {
      source: "gemini",
      model: GEMINI_MODEL,
      brief: parsed,
    });

    return {
      source: "gemini",
      cached: false,
      cacheTtlSeconds: Math.ceil(AI_BRIEF_CACHE_TTL_MS / 1000),
      brief: cached.brief,
    };
  } catch {
    const cached = setCachedBrief(
      cacheKey,
      {
        source: "fallback",
        brief: fallbackBrief(input),
      },
      AI_BRIEF_FALLBACK_CACHE_TTL_MS,
    );

    return {
      source: "fallback",
      cached: false,
      cacheTtlSeconds: getCacheTtlSeconds(cached),
      brief: cached.brief,
    };
  }
}
