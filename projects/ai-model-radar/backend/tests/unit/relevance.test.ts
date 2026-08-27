import { describe, expect, it } from "vitest";

import {
  AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION,
  assessAiDevelopmentRelevance,
} from "../../src/relevance/ai-development.js";

describe("AI development relevance policy", () => {
  it.each([
    "5 ways to upgrade your home decor with Google Search",
    "Back-to-school study tools for students and families",
    "Get closer to the game with Gemini and Pixel",
    "5 ways AI Mode in Search helps you enjoy the real world",
    "Create, edit and star in videos with two Google Vids updates",
  ])("rejects unrelated Google feed content: %s", (title) => {
    expect(
      assessAiDevelopmentRelevance({ sourceKind: "rss", title, summary: "Google product tips" }),
    ).toEqual({
      relevant: false,
      reason: "no-ai-development-signal",
      matchedSignal: null,
      policyVersion: AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION,
    });
  });

  it.each([
    "Gemini API adds structured outputs for AI developers",
    "A practical guide to large language model inference",
    "面向开发者的大模型推理与多模态能力更新",
  ])("accepts explicit AI development content: %s", (title) => {
    expect(
      assessAiDevelopmentRelevance({ sourceKind: "rss", title, summary: "Official update" })
        .relevant,
    ).toBe(true);
  });

  it("accepts releases only because the source is an approved AI development repository", () => {
    expect(
      assessAiDevelopmentRelevance({
        sourceKind: "github_releases",
        title: "v1.2.3",
        summary: "Official release notes",
      }),
    ).toMatchObject({
      relevant: true,
      reason: "approved-ai-development-repository",
    });
  });

  it("does not treat generic developer wording as sufficient without an AI signal", () => {
    expect(
      assessAiDevelopmentRelevance({
        sourceKind: "rss",
        title: "New Android developer conference schedule",
        summary: "Mobile application sessions",
      }).relevant,
    ).toBe(false);
  });

  it("does not treat generic AI wording as sufficient without a development signal", () => {
    expect(
      assessAiDevelopmentRelevance({
        sourceKind: "rss",
        title: "The latest AI news announced this month",
        summary: "A roundup of consumer AI features and experiences.",
      }).relevant,
    ).toBe(false);
  });
});
