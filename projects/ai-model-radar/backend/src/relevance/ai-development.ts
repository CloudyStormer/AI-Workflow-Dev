import type { CollectedEvent, SourceKind } from "../domain/types.js";

export const AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION =
  "ai-development-relevance-1.0.0";

const ENGLISH_PATTERNS: readonly RegExp[] = [
  /\b(?:large )?language models?\b/iu,
  /\bllms?\b/iu,
  /\bmachine learning\b/iu,
  /\bdeep learning\b/iu,
  /\bgenerative ai\b/iu,
  /\bgenai\b/iu,
  /\bfoundation models?\b/iu,
  /\b(?:reasoning|vision|multimodal|embedding|inference) models?\b/iu,
  /\btransformers?\b/iu,
  /\bneural networks?\b/iu,
  /\bfine[- ]?tuning\b/iu,
  /\bmodel context protocol\b/iu,
  /\bai agents?\b/iu,
  /\bai (?:models?|systems?|research|developers?|engineering|infrastructure|platforms?|apis?|sdks?|coding)\b/iu,
  /\b(?:research|developers?|engineering|infrastructure|platforms?|apis?|sdks?|coding)\b.{0,40}\bai\b/iu,
  /\bbuild(?:ing)? and deploy(?:ing)?\b/iu,
  /\bvibe coding\b/iu,
  /\bfull[- ]stack (?:approach to )?ai\b/iu,
  /\bgemini\b.{0,40}\b(?:apis?|models?|agents?|developers?|mcp)\b/iu,
  /\b(?:apis?|models?|agents?|developers?|mcp)\b.{0,40}\bgemini\b/iu,
  /\bgpt-?\d[\w.-]*\b/iu,
  /\bclaude(?:-|\s)?\d[\w.-]*\b/iu,
  /\b(?:chatgpt|claude)\s+(?:apis?|sdks?|models?|developers?)\b/iu,
  /\bdeveloper(?:s)?\s+(?:api|sdk|platform|tools?)\b/iu,
  /\b(?:api|sdk)\s+for\s+developers?\b/iu,
];

const CHINESE_TERMS = [
  "大模型",
  "语言模型",
  "生成式ai",
  "生成式 AI",
  "机器学习",
  "深度学习",
  "多模态",
  "模型推理",
  "模型训练",
  "模型微调",
  "智能体",
  "神经网络",
  "模型评测",
  "开源模型",
  "ai开发",
  "AI 开发",
  "开发者api",
  "开发者 API",
] as const;

export interface RelevanceCandidate {
  readonly sourceKind: SourceKind | null;
  readonly title: string;
  readonly summary: string;
}

export interface RelevanceDecision {
  readonly relevant: boolean;
  readonly reason:
    | "approved-ai-development-repository"
    | "matched-ai-development-term"
    | "no-ai-development-signal";
  readonly matchedSignal: string | null;
  readonly policyVersion: typeof AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION;
}

export function assessAiDevelopmentRelevance(
  candidate: RelevanceCandidate,
): RelevanceDecision {
  if (candidate.sourceKind === "github_releases") {
    return {
      relevant: true,
      reason: "approved-ai-development-repository",
      matchedSignal: "source_kind=github_releases",
      policyVersion: AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION,
    };
  }

  const text = `${candidate.title}\n${candidate.summary}`.normalize("NFKC");
  for (const pattern of ENGLISH_PATTERNS) {
    const match = pattern.exec(text);
    if (match !== null) {
      return {
        relevant: true,
        reason: "matched-ai-development-term",
        matchedSignal: match[0],
        policyVersion: AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION,
      };
    }
  }
  const lowercaseText = text.toLocaleLowerCase("zh-CN");
  const chineseTerm = CHINESE_TERMS.find((term) =>
    lowercaseText.includes(term.toLocaleLowerCase("zh-CN")),
  );
  if (chineseTerm !== undefined) {
    return {
      relevant: true,
      reason: "matched-ai-development-term",
      matchedSignal: chineseTerm,
      policyVersion: AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION,
    };
  }
  return {
    relevant: false,
    reason: "no-ai-development-signal",
    matchedSignal: null,
    policyVersion: AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION,
  };
}

export function filterAiDevelopmentEvents(
  events: readonly CollectedEvent[],
  sourceKind: SourceKind,
): readonly CollectedEvent[] {
  return events.filter(
    (event) =>
      assessAiDevelopmentRelevance({
        sourceKind,
        title: event.title,
        summary: event.summary,
      }).relevant,
  );
}
