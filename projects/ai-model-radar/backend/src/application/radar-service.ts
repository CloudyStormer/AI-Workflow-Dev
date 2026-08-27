import { createHash } from "node:crypto";

import type { RefreshResult, Truth } from "../domain/types.js";
import { RadarRepository } from "../infrastructure/repository.js";
import { PublicSourceCollector } from "../sources/collector.js";
import { APPROVED_PUBLIC_SOURCES } from "../sources/definitions.js";

export class RadarService {
  constructor(
    readonly repository: RadarRepository,
    private readonly collector: PublicSourceCollector,
  ) {}

  initialize(): void {
    this.repository.migrate();
    this.repository.seedSources(APPROVED_PUBLIC_SOURCES);
  }

  async refresh(idempotencyKey: string, triggerKind = "manual"): Promise<RefreshResult> {
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      throw new Error("IDEMPOTENCY_KEY_INVALID");
    }
    const reservation = this.repository.reserveRefresh(idempotencyKey, triggerKind);
    if (reservation.existingResult !== null) {
      return { ...reservation.existingResult, reused: true };
    }
    const runs = await Promise.all(
      APPROVED_PUBLIC_SOURCES.map(async (source) => {
        const result = await this.collector.collect(source);
        this.repository.recordSourceRun(result);
        return result;
      }),
    );
    const publication = this.repository.publish(reservation.requestId, runs);
    const result: RefreshResult = {
      requestId: reservation.requestId,
      reused: false,
      status: publication === null ? "failed" : "completed",
      truth: publication?.truth ?? this.currentTruth("failed"),
      snapshotId: publication?.snapshotId ?? null,
      eventCount: publication?.eventCount ?? this.repository.listEvents(200).length,
      insertedEvents: publication?.insertedEvents ?? 0,
      newRevisions: publication?.newRevisions ?? 0,
      sourceSuccessCount: runs.filter((run) => run.outcome === "success").length,
      sourceFailureCount: runs.filter((run) => run.outcome === "failed").length,
      completedAt: new Date().toISOString(),
    };
    this.repository.completeRefresh(reservation.requestId, result);
    return result;
  }

  currentTruth(noSnapshotTruth: Truth = "not_ready"): Truth {
    const snapshot = this.repository.getCurrentSnapshot();
    if (snapshot === null) return noSnapshotTruth;
    const asOf = Date.parse(String(snapshot.as_of));
    if (Number.isFinite(asOf) && Date.now() - asOf > 24 * 60 * 60 * 1_000) return "stale";
    return String(snapshot.truth) as Truth;
  }

  content<T>(data: T): Record<string, unknown> {
    const snapshot = this.repository.getCurrentSnapshot();
    const observedAt = new Date().toISOString();
    return {
      schema_version: "1.0",
      data_mode: "live",
      truth: this.currentTruth(),
      project_state: snapshot === null ? "no_published_snapshot" : "local_real_source_runtime",
      snapshot_id: snapshot?.snapshot_id ?? null,
      snapshot_revision: snapshot?.manifest_sha256 ?? null,
      policy_bundle_sha256: "2c3005efa6b3397f1d085d5ed583bafcb99fc2c2d0849ac8455bded5f2ada2f8",
      coverage_policy: null,
      rule_revision: "radar-runtime-v1",
      as_of: snapshot?.as_of ?? null,
      observed_at: observedAt,
      last_success_at: snapshot?.published_at ?? null,
      freshness: {
        status: this.currentTruth(),
        age_seconds:
          snapshot === null ? null : Math.max(0, Math.floor((Date.now() - Date.parse(String(snapshot.as_of))) / 1_000)),
      },
      coverage: {
        approved: APPROVED_PUBLIC_SOURCES.length,
        runtime_enabled: APPROVED_PUBLIC_SOURCES.length,
        succeeded: snapshot?.source_success_count ?? 0,
        blocked: snapshot?.source_failure_count ?? 0,
      },
      source_watermarks: snapshot === null ? [] : this.repository.listSources(),
      data,
      errors: [],
    };
  }

  makeRequestId(seed: string): string {
    return `request_${createHash("sha256").update(seed).digest("hex").slice(0, 20)}`;
  }
}
