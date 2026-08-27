import { XMLParser } from "fast-xml-parser";

import type { CollectedEvent, SourceDefinition, SourceRunResult } from "../domain/types.js";

const ALLOWED_HOSTS = new Set([
  "openai.com",
  "www.openai.com",
  "blog.google",
  "api.github.com",
  "github.com",
]);

function safeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return safeText(object["#text"] ?? object.__cdata ?? object._text ?? "");
  }
  return "";
}

function normalizeSummary(value: unknown): string {
  return safeText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function normalizeDate(value: unknown): string | null {
  const candidate = safeText(value);
  const milliseconds = Date.parse(candidate);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function atomLink(value: unknown): string {
  for (const entry of toArray(value)) {
    if (typeof entry === "string") return entry;
    if (entry !== null && typeof entry === "object") {
      const object = entry as Record<string, unknown>;
      if (object.rel === undefined || object.rel === "alternate") {
        const href = safeText(object.href);
        if (href !== "") return href;
      }
    }
  }
  return "";
}

function validateCanonicalUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseRss(source: SourceDefinition, body: string, collectedAt: string): CollectedEvent[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", trimValues: true });
  const document = parser.parse(body) as Record<string, unknown>;
  const rss = document.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  const feed = document.feed as Record<string, unknown> | undefined;
  const records = channel === undefined ? toArray(feed?.entry) : toArray(channel.item);
  const events: CollectedEvent[] = [];
  for (const raw of records.slice(0, 20)) {
    if (raw === null || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const canonicalUrl = validateCanonicalUrl(
      channel === undefined ? atomLink(record.link) : safeText(record.link),
    );
    const title = safeText(record.title).trim();
    const publishedAt = normalizeDate(
      record.pubDate ?? record.published ?? record.updated ?? record["dc:date"],
    );
    if (canonicalUrl === null || title === "" || publishedAt === null) continue;
    events.push({
      sourceId: source.sourceId,
      publisher: source.publisher,
      region: source.region,
      canonicalUrl,
      title: title.slice(0, 300),
      summary: normalizeSummary(record.description ?? record.summary ?? record.content),
      category: "ai_news",
      eventKind: "news",
      versionLabel: null,
      publishedAt,
      collectedAt,
      confidence: "high",
    });
  }
  return events;
}

function parseGitHub(source: SourceDefinition, body: string, collectedAt: string): CollectedEvent[] {
  const parsed = JSON.parse(body) as unknown;
  if (!Array.isArray(parsed)) throw new Error("SOURCE_SCHEMA_INVALID");
  const events: CollectedEvent[] = [];
  for (const raw of parsed.slice(0, 20)) {
    if (raw === null || typeof raw !== "object") continue;
    const release = raw as Record<string, unknown>;
    const canonicalUrl = validateCanonicalUrl(safeText(release.html_url));
    const title = safeText(release.name || release.tag_name).trim();
    const publishedAt = normalizeDate(release.published_at ?? release.created_at);
    if (canonicalUrl === null || title === "" || publishedAt === null) continue;
    const tag = safeText(release.tag_name).trim();
    events.push({
      sourceId: source.sourceId,
      publisher: source.publisher,
      region: source.region,
      canonicalUrl,
      title: `${source.publisher} ${title}`.slice(0, 300),
      summary: normalizeSummary(release.body),
      category: "open_source",
      eventKind: "open_source_release",
      versionLabel: tag === "" ? null : tag.slice(0, 120),
      publishedAt,
      collectedAt,
      confidence: "high",
    });
  }
  return events;
}

function safeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") return "SOURCE_TIMEOUT";
    if (/SOURCE_|HTTP_/.test(error.message)) return error.message.slice(0, 120);
  }
  return "SOURCE_FETCH_FAILED";
}

export class PublicSourceCollector {
  constructor(
    private readonly timeoutMs: number,
    private readonly retries: number,
  ) {}

  async collect(source: SourceDefinition): Promise<SourceRunResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    let lastError: unknown;
    let lastStatus: number | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await fetch(source.endpointUrl, {
          headers: {
            accept: source.sourceKind === "rss" ? "application/rss+xml, application/atom+xml, application/xml" : "application/vnd.github+json",
            "user-agent": "AIModelRadar/0.1 (local public source collector)",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        lastStatus = response.status;
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const finalUrl = new URL(response.url);
        if (finalUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(finalUrl.hostname)) {
          throw new Error("SOURCE_REDIRECT_NOT_ALLOWED");
        }
        const body = await response.text();
        if (body.length > 5_000_000) throw new Error("SOURCE_RESPONSE_TOO_LARGE");
        const collectedAt = new Date().toISOString();
        const events =
          source.sourceKind === "rss"
            ? parseRss(source, body, collectedAt)
            : parseGitHub(source, body, collectedAt);
        return {
          source,
          outcome: "success",
          startedAt,
          finishedAt: collectedAt,
          durationMs: Math.round(performance.now() - started),
          httpStatus: response.status,
          bytesReceived: Buffer.byteLength(body),
          retryCount: attempt,
          events,
          safeError: null,
        };
      } catch (error) {
        lastError = error;
        if (attempt < this.retries) {
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
        }
      }
    }
    return {
      source,
      outcome: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started),
      httpStatus: lastStatus,
      bytesReceived: 0,
      retryCount: this.retries,
      events: [],
      safeError: safeError(lastError),
    };
  }
}
