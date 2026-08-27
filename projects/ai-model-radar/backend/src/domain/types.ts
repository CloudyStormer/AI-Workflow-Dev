export type SourceKind = "rss" | "github_releases";
export type Region = "CN" | "GLOBAL";
export type Truth = "live" | "not_ready" | "stale" | "degraded" | "failed" | "empty";

export interface SourceDefinition {
  readonly sourceId: string;
  readonly name: string;
  readonly publisher: string;
  readonly region: Region;
  readonly sourceKind: SourceKind;
  readonly endpointUrl: string;
  readonly homepageUrl: string;
  readonly pollIntervalMinutes: number;
}

export interface CollectedEvent {
  readonly sourceId: string;
  readonly publisher: string;
  readonly region: Region;
  readonly canonicalUrl: string;
  readonly title: string;
  readonly summary: string;
  readonly category: string;
  readonly eventKind: "news" | "open_source_release";
  readonly versionLabel: string | null;
  readonly publishedAt: string;
  readonly collectedAt: string;
  readonly confidence: "high";
}

export interface SourceRunResult {
  readonly source: SourceDefinition;
  readonly outcome: "success" | "failed";
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly httpStatus: number | null;
  readonly bytesReceived: number;
  readonly retryCount: number;
  readonly events: readonly CollectedEvent[];
  readonly safeError: string | null;
}

export interface RefreshResult {
  readonly requestId: string;
  readonly reused: boolean;
  readonly status: "completed" | "failed";
  readonly truth: Truth;
  readonly snapshotId: string | null;
  readonly eventCount: number;
  readonly insertedEvents: number;
  readonly newRevisions: number;
  readonly sourceSuccessCount: number;
  readonly sourceFailureCount: number;
  readonly completedAt: string;
}
