import { createHash } from "node:crypto";

import type {
  AnalysisSummary,
  FactLayer,
  FindingKind,
} from "../../contracts/material-analysis";

export const ANALYSIS_RULE_BUNDLE = Object.freeze({
  id: "career-local-deterministic-analysis",
  version: "1.0.0",
  sha256: createHash("sha256")
    .update("career-local-deterministic-analysis|1.0.0|zh-cn-keywords-sentences-v1")
    .digest("hex"),
});

export const CLASSIFICATION_RULE_REVISION = "career-local-classification-1.0.0";

export interface DeterministicFinding {
  readonly kind: FindingKind;
  readonly label: string;
  readonly factLayer: FactLayer;
  readonly confidence: number;
  readonly startCodepoint: number | null;
  readonly endCodepoint: number | null;
  readonly snippet: string | null;
  readonly relation: "supports" | "insufficient";
}

export interface DeterministicAnalysis {
  readonly summary: AnalysisSummary;
  readonly findings: readonly DeterministicFinding[];
}

export interface ClassificationSuggestion {
  readonly sourceChannel: string;
  readonly contentType: string;
  readonly basis: readonly string[];
  readonly confidence: number;
}

const TOKEN_GROUPS: ReadonlyArray<{
  readonly kind: Extract<FindingKind, "skill" | "tool" | "framework">;
  readonly confidence: number;
  readonly tokens: readonly string[];
}> = [
  {
    kind: "framework",
    confidence: 0.96,
    tokens: ["React", "Vue", "Angular", "Svelte", "Next.js", "NextJS", "Nuxt"],
  },
  {
    kind: "tool",
    confidence: 0.94,
    tokens: ["Git", "Vite", "Webpack", "Rollup", "pnpm", "npm", "Docker", "Figma", "Playwright", "Vitest", "Jest"],
  },
  {
    kind: "skill",
    confidence: 0.92,
    tokens: [
      "TypeScript",
      "JavaScript",
      "HTML",
      "CSS",
      "Node.js",
      "NodeJS",
      "性能优化",
      "可访问性",
      "工程化",
      "单元测试",
      "自动化测试",
    ],
  },
];

const SENTENCE_RULES: ReadonlyArray<{
  readonly kind: Extract<FindingKind, "responsibility" | "project" | "outcome">;
  readonly pattern: RegExp;
  readonly confidence: number;
}> = [
  {
    kind: "responsibility",
    pattern: /(?:负责|主导|参与|设计|实现|维护|推进|协作)/u,
    confidence: 0.9,
  },
  {
    kind: "project",
    pattern: /(?:项目|平台|系统|产品|应用|网站|中台|组件库)/u,
    confidence: 0.86,
  },
  {
    kind: "outcome",
    pattern: /(?:提升|降低|增长|减少|优化|上线|交付|完成|节省|缩短|提高).{0,16}(?:\d+(?:\.\d+)?%?|倍|小时|天|周|月)?/u,
    confidence: 0.84,
  },
];

export function suggestClassification(body: string): ClassificationSuggestion {
  const lowered = body.toLocaleLowerCase("zh-CN");
  const basis: string[] = [];
  let sourceChannel = "user_input";
  let contentType = "article_or_note";
  let confidence = 0.72;

  if (/(?:简历|教育经历|工作经历|求职|个人简介)/u.test(body)) {
    contentType = "resume";
    basis.push("检测到简历或个人经历结构词");
    confidence = 0.91;
  } else if (/(?:岗位职责|任职要求|招聘|职位描述|薪资|jd\b)/iu.test(body)) {
    contentType = "job_description";
    basis.push("检测到招聘或岗位描述结构词");
    confidence = 0.9;
  } else if (/(?:面试|一面|二面|面经|面试题)/u.test(body)) {
    contentType = "interview_note";
    basis.push("检测到面试记录结构词");
    confidence = 0.88;
  } else if (/(?:项目|负责|实现|交付)/u.test(body)) {
    contentType = "project_record";
    basis.push("检测到项目与职责陈述");
    confidence = 0.83;
  } else {
    basis.push("未命中特定材料结构，保留为文章或笔记");
  }

  if (lowered.includes("linkedin")) {
    sourceChannel = "professional_network";
    basis.push("正文包含 LinkedIn 来源线索");
  } else if (/(?:boss直聘|猎聘|智联招聘|拉勾)/u.test(body)) {
    sourceChannel = "recruiting_platform";
    basis.push("正文包含招聘平台来源线索");
  }

  return Object.freeze({
    sourceChannel,
    contentType,
    basis: Object.freeze(basis),
    confidence,
  });
}

export function analyzeDeterministically(body: string): DeterministicAnalysis {
  const codepoints = Array.from(body);
  const findings: DeterministicFinding[] = [];
  const occupiedLabels = new Set<string>();

  for (const group of TOKEN_GROUPS) {
    for (const token of group.tokens) {
      const location = findCodepointRange(codepoints, token);
      const canonicalLabel = canonicalizeToken(token);
      const identity = `${group.kind}:${canonicalLabel.toLocaleLowerCase("en-US")}`;
      if (location === null || occupiedLabels.has(identity)) {
        continue;
      }
      occupiedLabels.add(identity);
      findings.push({
        kind: group.kind,
        label: canonicalLabel,
        factLayer: "user-stated",
        confidence: group.confidence,
        startCodepoint: location.start,
        endCodepoint: location.end,
        snippet: codepoints.slice(location.start, location.end).join(""),
        relation: "supports",
      });
    }
  }

  for (const sentence of splitSentences(codepoints)) {
    for (const rule of SENTENCE_RULES) {
      if (!rule.pattern.test(sentence.text)) {
        continue;
      }
      const label = sentence.text.length > 96
        ? `${Array.from(sentence.text).slice(0, 93).join("")}…`
        : sentence.text;
      const identity = `${rule.kind}:${label}`;
      if (occupiedLabels.has(identity)) {
        continue;
      }
      occupiedLabels.add(identity);
      findings.push({
        kind: rule.kind,
        label,
        factLayer: "user-stated",
        confidence: rule.confidence,
        startCodepoint: sentence.start,
        endCodepoint: sentence.end,
        snippet: sentence.text,
        relation: "supports",
      });
    }
  }

  const frameworkFinding = findings.find((finding) => finding.kind === "framework");
  if (
    frameworkFinding !== undefined &&
    frameworkFinding.startCodepoint !== null &&
    frameworkFinding.endCodepoint !== null
  ) {
    findings.push({
      kind: "skill",
      label: "可能具备前端框架实践经历",
      factLayer: "system-inference",
      confidence: 0.62,
      startCodepoint: frameworkFinding.startCodepoint,
      endCodepoint: frameworkFinding.endCodepoint,
      snippet: frameworkFinding.snippet,
      relation: "supports",
    });
  }

  const requiredKinds: readonly FindingKind[] = [
    "skill",
    "tool",
    "framework",
    "responsibility",
    "project",
    "outcome",
  ];
  const unknownKinds = requiredKinds.filter(
    (kind) => !findings.some((finding) => finding.kind === kind),
  );
  for (const kind of unknownKinds) {
    findings.push({
      kind: "unknown",
      label: `${kind}: 未从当前原文识别到可定位证据`,
      factLayer: "UNKNOWN",
      confidence: 0,
      startCodepoint: null,
      endCodepoint: null,
      snippet: null,
      relation: "insufficient",
    });
  }

  const counts = countByKind(findings);
  const strongestSignals = findings
    .filter((finding) => finding.factLayer !== "UNKNOWN")
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5)
    .map((finding) => `${finding.kind}:${finding.label}`);
  const summary: AnalysisSummary = Object.freeze({
    headline: `识别到 ${findings.length - unknownKinds.length} 条可定位信号，${unknownKinds.length} 类证据仍未知`,
    counts: Object.freeze(counts),
    strongestSignals: Object.freeze(strongestSignals),
    unknownKinds: Object.freeze(unknownKinds),
    truthNotice: "所有直接提取仅代表用户提交材料中的陈述；系统推断与 UNKNOWN 不代表外部核验或已掌握。",
  });

  return Object.freeze({
    summary,
    findings: Object.freeze(findings.map((finding) => Object.freeze(finding))),
  });
}

function findCodepointRange(
  codepoints: readonly string[],
  token: string,
): { readonly start: number; readonly end: number } | null {
  const haystack = codepoints.join("").toLocaleLowerCase("en-US");
  const needle = token.toLocaleLowerCase("en-US");
  const utf16Index = haystack.indexOf(needle);
  if (utf16Index < 0) {
    return null;
  }
  const start = Array.from(haystack.slice(0, utf16Index)).length;
  return { start, end: start + Array.from(needle).length };
}

function splitSentences(codepoints: readonly string[]): ReadonlyArray<{
  readonly text: string;
  readonly start: number;
  readonly end: number;
}> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  let start = 0;
  for (let index = 0; index <= codepoints.length; index += 1) {
    const value = codepoints[index];
    if (index < codepoints.length && value !== "。" && value !== "！" && value !== "？" && value !== "\n") {
      continue;
    }
    const raw = codepoints.slice(start, index).join("").trim();
    if (raw.length > 0) {
      const prefixLength = Array.from(codepoints.slice(start, index).join("")).findIndex(
        (character) => character.trim().length > 0,
      );
      const actualStart = start + Math.max(prefixLength, 0);
      sentences.push({
        text: raw,
        start: actualStart,
        end: actualStart + Array.from(raw).length,
      });
    }
    start = index + 1;
  }
  return sentences;
}

function canonicalizeToken(token: string): string {
  if (token === "NextJS") {
    return "Next.js";
  }
  if (token === "NodeJS") {
    return "Node.js";
  }
  return token;
}

function countByKind(findings: readonly DeterministicFinding[]): Record<FindingKind, number> {
  const counts: Record<FindingKind, number> = {
    skill: 0,
    tool: 0,
    framework: 0,
    responsibility: 0,
    project: 0,
    outcome: 0,
    unknown: 0,
  };
  for (const finding of findings) {
    counts[finding.kind] += 1;
  }
  return counts;
}
