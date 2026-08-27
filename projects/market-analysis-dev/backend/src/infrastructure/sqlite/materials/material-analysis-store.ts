import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import {
  MaterialAnalysisContractError,
  type AnalysisFindingRecord,
  type AnalysisRevisionRecord,
  type AnalyzeMaterialInput,
  type ClassificationDecisionRecord,
  type ClassificationSuggestionRecord,
  type ConfirmClassificationInput,
  type MaterialHistoryRecord,
  type MaterialMetadata,
  type MaterialVersionRecord,
  type SaveMaterialVersionInput,
} from "../../../contracts/material-analysis";
import {
  ANALYSIS_RULE_BUNDLE,
  CLASSIFICATION_RULE_REVISION,
  analyzeDeterministically,
  suggestClassification,
} from "../../../modules/material-analysis/deterministic-analyzer";

interface MaterialVersionRow {
  readonly tenant_id: string;
  readonly account_id: string;
  readonly material_id: string;
  readonly version_id: string;
  readonly version_no: number;
  readonly body_ciphertext: Uint8Array;
  readonly body_nonce: Uint8Array;
  readonly body_auth_tag: Uint8Array;
  readonly body_sha256: string;
  readonly unicode_count: number;
  readonly metadata_json: string;
  readonly created_at: string;
}

interface IdempotencyRow {
  readonly payload_sha256: string;
  readonly response_resource_id: string;
}

interface ClassificationSuggestionRow {
  readonly suggestion_id: string;
  readonly request_id: string;
  readonly material_id: string;
  readonly material_version_id: string;
  readonly source_channel: string;
  readonly content_type: string;
  readonly basis_json: string;
  readonly confidence: number;
  readonly rule_revision: string;
  readonly created_at: string;
}

interface ClassificationDecisionRow {
  readonly decision_id: string;
  readonly material_id: string;
  readonly material_version_id: string;
  readonly revision_no: number;
  readonly source_channel: string;
  readonly content_type: string;
  readonly fact_layer: "user-confirmed";
  readonly created_at: string;
}

interface AnalysisRevisionRow {
  readonly tenant_id: string;
  readonly account_id: string;
  readonly analysis_revision_id: string;
  readonly analysis_job_id: string;
  readonly material_id: string;
  readonly material_version_id: string;
  readonly material_version_sha256: string;
  readonly classification_decision_id: string;
  readonly revision_no: number;
  readonly status: "completed" | "uncertain";
  readonly rule_bundle_id: string;
  readonly rule_bundle_version: string;
  readonly rule_bundle_sha256: string;
  readonly public_snapshot_id: string | null;
  readonly public_snapshot_sha256: string | null;
  readonly structured_summary_json: string;
  readonly result_sha256: string;
  readonly created_at: string;
}

interface AnalysisFindingRow {
  readonly finding_id: string;
  readonly finding_kind: AnalysisFindingRecord["kind"];
  readonly label: string;
  readonly fact_layer: AnalysisFindingRecord["factLayer"];
  readonly confidence: number;
  readonly rule_revision: string;
  readonly evidence_id: string | null;
  readonly start_codepoint: number | null;
  readonly end_codepoint: number | null;
  readonly snippet: string | null;
  readonly relation: "supports" | "insufficient" | null;
}

export interface ClassifyMaterialInput {
  readonly tenantId: string;
  readonly accountId: string;
  readonly materialId: string;
  readonly materialVersionId: string;
  readonly idempotencyKey: string;
}

export class MaterialAnalysisStore {
  private readonly database: DatabaseSync;
  private readonly encryptionKey: Buffer;

  public constructor(databasePath: string, encryptionKey: Uint8Array) {
    if (encryptionKey.byteLength !== 32) {
      throw new MaterialAnalysisContractError(
        "STORAGE_NOT_READY",
        "material encryption key must contain exactly 32 bytes",
      );
    }
    this.encryptionKey = Buffer.from(encryptionKey);
    this.database = new DatabaseSync(databasePath);
    try {
      this.database.exec("PRAGMA busy_timeout = 5000");
      this.database.exec("PRAGMA foreign_keys = ON");
      this.database.exec("PRAGMA journal_mode = WAL");
      this.database
        .prepare("SELECT 1 FROM material_versions LIMIT 1")
        .get();
    } catch (error) {
      this.database.close();
      this.encryptionKey.fill(0);
      throw new MaterialAnalysisContractError(
        "STORAGE_NOT_READY",
        `private schema is unavailable: ${safeErrorMessage(error)}`,
      );
    }
  }

  public close(): void {
    this.database.close();
    this.encryptionKey.fill(0);
  }

  public saveMaterialVersion(input: SaveMaterialVersionInput): MaterialVersionRecord {
    validateIdentifier(input.tenantId, "tenantId");
    validateIdentifier(input.accountId, "accountId");
    validateIdentifier(input.materialId, "materialId");
    validateIdempotencyKey(input.idempotencyKey);
    if (input.rightsConfirmation.userHasRights !== true) {
      throw new MaterialAnalysisContractError(
        "RIGHTS_CONFIRMATION_REQUIRED",
        "user rights confirmation is required before private persistence",
      );
    }
    validateIdentifier(input.rightsConfirmation.policyRevision, "rights policy revision");
    const unicodeCount = validateBody(input.body);
    const metadataJson = canonicalJson(input.metadata);
    const bodySha256 = sha256(input.body);
    const payloadSha256 = sha256(
      canonicalJson({
        bodySha256,
        materialId: input.materialId,
        metadata: input.metadata,
        rightsConfirmation: input.rightsConfirmation,
        storageScope: input.storageScope,
      }),
    );
    const replay = this.readIdempotency(
      input.tenantId,
      input.accountId,
      "save_material_version",
      input.materialId,
      input.idempotencyKey,
      payloadSha256,
    );
    if (replay !== null) {
      return this.getMaterialVersion(
        input.tenantId,
        input.accountId,
        replay.response_resource_id,
      );
    }

    return this.inTransaction(() => {
      const now = new Date().toISOString();
      this.database
        .prepare(
          `INSERT INTO materials (
            tenant_id, account_id, material_id, storage_scope, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (tenant_id, account_id, material_id) DO NOTHING`,
        )
        .run(
          input.tenantId,
          input.accountId,
          input.materialId,
          input.storageScope,
          now,
          now,
        );

      const existing = this.database
        .prepare(
          `SELECT version_id FROM material_versions
           WHERE tenant_id = ? AND account_id = ? AND material_id = ? AND body_sha256 = ?`,
        )
        .get(input.tenantId, input.accountId, input.materialId, bodySha256) as
        | { readonly version_id: string }
        | undefined;
      if (existing !== undefined) {
        this.insertIdempotency(
          input.tenantId,
          input.accountId,
          "save_material_version",
          input.materialId,
          input.idempotencyKey,
          payloadSha256,
          existing.version_id,
          now,
        );
        return this.getMaterialVersion(
          input.tenantId,
          input.accountId,
          existing.version_id,
        );
      }

      const current = this.database
        .prepare(
          `SELECT current_version_no FROM materials
           WHERE tenant_id = ? AND account_id = ? AND material_id = ?`,
        )
        .get(input.tenantId, input.accountId, input.materialId) as {
        readonly current_version_no: number;
      };
      const versionNo = current.current_version_no + 1;
      const versionId = prefixedId("mv");
      const encrypted = encryptBody(
        input.body,
        this.encryptionKey,
        aadFor(input.tenantId, input.accountId, input.materialId, versionId),
      );
      this.database
        .prepare(
          `INSERT INTO material_versions (
            tenant_id, account_id, material_id, version_id, version_no,
            body_ciphertext, body_nonce, body_auth_tag, body_sha256,
            unicode_count, metadata_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.tenantId,
          input.accountId,
          input.materialId,
          versionId,
          versionNo,
          encrypted.ciphertext,
          encrypted.nonce,
          encrypted.authTag,
          bodySha256,
          unicodeCount,
          metadataJson,
          now,
        );
      this.database
        .prepare(
          `INSERT INTO material_rights_receipts (
            tenant_id, account_id, receipt_id, material_version_id,
            user_has_rights, sensitive_data_acknowledged, policy_revision, created_at
          ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
        )
        .run(
          input.tenantId,
          input.accountId,
          prefixedId("rights"),
          versionId,
          input.rightsConfirmation.sensitiveDataAcknowledged ? 1 : 0,
          input.rightsConfirmation.policyRevision,
          now,
        );
      this.database
        .prepare(
          `UPDATE materials
           SET current_version_no = ?, updated_at = ?
           WHERE tenant_id = ? AND account_id = ? AND material_id = ?`,
        )
        .run(versionNo, now, input.tenantId, input.accountId, input.materialId);
      this.insertIdempotency(
        input.tenantId,
        input.accountId,
        "save_material_version",
        input.materialId,
        input.idempotencyKey,
        payloadSha256,
        versionId,
        now,
      );
      this.insertSyncChange(
        input.tenantId,
        input.accountId,
        "material_version",
        versionId,
        versionNo,
        input.idempotencyKey,
        { materialId: input.materialId, versionNo },
        now,
      );
      return this.getMaterialVersion(input.tenantId, input.accountId, versionId);
    });
  }

  public getMaterialVersion(
    tenantId: string,
    accountId: string,
    versionId: string,
  ): MaterialVersionRecord {
    const row = this.database
      .prepare(
        `SELECT * FROM material_versions
         WHERE tenant_id = ? AND account_id = ? AND version_id = ?`,
      )
      .get(tenantId, accountId, versionId) as MaterialVersionRow | undefined;
    if (row === undefined) {
      throw new MaterialAnalysisContractError(
        "MATERIAL_VERSION_NOT_FOUND",
        "material version does not exist for this account",
      );
    }
    return materialVersionFromRow(row, this.encryptionKey);
  }

  public classifyMaterial(input: ClassifyMaterialInput): ClassificationSuggestionRecord {
    validateIdempotencyKey(input.idempotencyKey);
    const version = this.getMaterialVersion(
      input.tenantId,
      input.accountId,
      input.materialVersionId,
    );
    if (version.materialId !== input.materialId) {
      throw new MaterialAnalysisContractError(
        "MATERIAL_VERSION_NOT_FOUND",
        "material version does not belong to the requested material",
      );
    }
    const payloadSha256 = sha256(
      canonicalJson({
        materialVersionId: version.versionId,
        materialVersionSha256: version.bodySha256,
        ruleRevision: CLASSIFICATION_RULE_REVISION,
      }),
    );
    const replay = this.readIdempotency(
      input.tenantId,
      input.accountId,
      "classify_material",
      input.materialId,
      input.idempotencyKey,
      payloadSha256,
    );
    if (replay !== null) {
      return this.getClassificationSuggestion(
        input.tenantId,
        input.accountId,
        replay.response_resource_id,
      );
    }

    const suggestion = suggestClassification(version.body);
    return this.inTransaction(() => {
      const now = new Date().toISOString();
      const requestId = prefixedId("crq");
      const jobId = prefixedId("cjob");
      const suggestionId = prefixedId("cs");
      const resultSha256 = sha256(canonicalJson(suggestion));
      this.database
        .prepare(
          `INSERT INTO classification_requests (
            tenant_id, account_id, request_id, material_id, material_version_id,
            material_version_sha256, rule_revision, payload_sha256,
            processor_permit_revision, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NONE', 'suggested', ?)`,
        )
        .run(
          input.tenantId,
          input.accountId,
          requestId,
          input.materialId,
          input.materialVersionId,
          version.bodySha256,
          CLASSIFICATION_RULE_REVISION,
          payloadSha256,
          now,
        );
      this.database
        .prepare(
          `INSERT INTO classification_jobs (
            tenant_id, account_id, job_id, request_id, status,
            status_revision, created_at, completed_at
          ) VALUES (?, ?, ?, ?, 'suggested', 1, ?, ?)`,
        )
        .run(input.tenantId, input.accountId, jobId, requestId, now, now);
      this.database
        .prepare(
          `INSERT INTO classification_step_attempts (
            tenant_id, account_id, attempt_id, job_id, input_sha256,
            rule_revision, outcome, result_sha256, started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'suggested', ?, ?, ?)`,
        )
        .run(
          input.tenantId,
          input.accountId,
          prefixedId("cattempt"),
          jobId,
          version.bodySha256,
          CLASSIFICATION_RULE_REVISION,
          resultSha256,
          now,
          now,
        );
      this.database
        .prepare(
          `INSERT INTO classification_suggestions (
            tenant_id, account_id, suggestion_id, request_id, source_channel,
            content_type, basis_json, confidence, rule_revision, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.tenantId,
          input.accountId,
          suggestionId,
          requestId,
          suggestion.sourceChannel,
          suggestion.contentType,
          canonicalJson(suggestion.basis),
          suggestion.confidence,
          CLASSIFICATION_RULE_REVISION,
          now,
        );
      this.insertIdempotency(
        input.tenantId,
        input.accountId,
        "classify_material",
        input.materialId,
        input.idempotencyKey,
        payloadSha256,
        suggestionId,
        now,
      );
      return this.getClassificationSuggestion(
        input.tenantId,
        input.accountId,
        suggestionId,
      );
    });
  }

  public confirmClassification(
    input: ConfirmClassificationInput,
  ): ClassificationDecisionRecord {
    const version = this.getMaterialVersion(
      input.tenantId,
      input.accountId,
      input.materialVersionId,
    );
    if (version.materialId !== input.materialId) {
      throw new MaterialAnalysisContractError(
        "MATERIAL_VERSION_NOT_FOUND",
        "material version does not belong to the requested material",
      );
    }
    const material = this.getMaterialState(input.tenantId, input.accountId, input.materialId);
    if (material.current_classification_revision !== input.expectedBaseRevision) {
      throw new MaterialAnalysisContractError(
        "REVISION_CONFLICT",
        `classification base revision ${input.expectedBaseRevision} is stale`,
      );
    }

    return this.inTransaction(() => {
      const now = new Date().toISOString();
      const revisionNo = input.expectedBaseRevision + 1;
      const decisionId = prefixedId("cd");
      this.database
        .prepare(
          `INSERT INTO classification_decision_revisions (
            tenant_id, account_id, decision_id, material_id, material_version_id,
            revision_no, base_revision_no, source_channel, content_type,
            actor, reason, fact_layer, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, 'user-confirmed', ?)`,
        )
        .run(
          input.tenantId,
          input.accountId,
          decisionId,
          input.materialId,
          input.materialVersionId,
          revisionNo,
          input.expectedBaseRevision,
          input.sourceChannel,
          input.contentType,
          input.reason,
          now,
        );
      const update = this.database
        .prepare(
          `UPDATE materials
           SET current_classification_revision = ?, updated_at = ?
           WHERE tenant_id = ? AND account_id = ? AND material_id = ?
             AND current_classification_revision = ?`,
        )
        .run(
          revisionNo,
          now,
          input.tenantId,
          input.accountId,
          input.materialId,
          input.expectedBaseRevision,
        );
      if (Number(update.changes) !== 1) {
        throw new MaterialAnalysisContractError(
          "REVISION_CONFLICT",
          "classification revision changed concurrently",
        );
      }
      this.insertSyncChange(
        input.tenantId,
        input.accountId,
        "classification_decision",
        decisionId,
        revisionNo,
        decisionId,
        { materialId: input.materialId, revisionNo },
        now,
      );
      return this.getClassificationDecision(
        input.tenantId,
        input.accountId,
        decisionId,
      );
    });
  }

  public analyzeMaterial(input: AnalyzeMaterialInput): AnalysisRevisionRecord {
    validateIdempotencyKey(input.idempotencyKey);
    const version = this.getMaterialVersion(
      input.tenantId,
      input.accountId,
      input.materialVersionId,
    );
    const decision = this.getClassificationDecision(
      input.tenantId,
      input.accountId,
      input.classificationDecisionId,
    );
    if (
      version.materialId !== input.materialId ||
      decision.materialId !== input.materialId ||
      decision.materialVersionId !== input.materialVersionId
    ) {
      throw new MaterialAnalysisContractError(
        "CLASSIFICATION_REQUIRED",
        "analysis requires a confirmed classification for the exact material version",
      );
    }
    if (
      input.publicSnapshot !== undefined &&
      !/^[0-9a-f]{64}$/u.test(input.publicSnapshot.manifestSha256)
    ) {
      throw new MaterialAnalysisContractError(
        "HISTORICAL_REFERENCE_MISMATCH",
        "public snapshot manifest hash is invalid",
      );
    }
    const payload = {
      classificationDecisionId: decision.decisionId,
      materialVersionId: version.versionId,
      materialVersionSha256: version.bodySha256,
      processorPermitRevision: "NONE",
      publicSnapshot: input.publicSnapshot ?? null,
      ruleBundle: ANALYSIS_RULE_BUNDLE,
    };
    const payloadSha256 = sha256(canonicalJson(payload));
    const logicalIdentitySha256 = sha256(
      [
        input.tenantId,
        input.accountId,
        version.bodySha256,
        decision.decisionId,
        input.publicSnapshot?.manifestSha256 ?? "NONE",
        ANALYSIS_RULE_BUNDLE.sha256,
        "NONE",
      ].join("|"),
    );
    const replay = this.readIdempotency(
      input.tenantId,
      input.accountId,
      "analyze_material",
      input.materialId,
      input.idempotencyKey,
      payloadSha256,
    );
    if (replay !== null) {
      return this.getAnalysisRevision(
        input.tenantId,
        input.accountId,
        replay.response_resource_id,
      );
    }
    const logicallyExisting = this.database
      .prepare(
        `SELECT ar.analysis_revision_id
         FROM analysis_requests req
         JOIN analysis_jobs job
           ON job.tenant_id = req.tenant_id AND job.account_id = req.account_id
          AND job.request_id = req.request_id
         JOIN analysis_revisions ar
           ON ar.tenant_id = job.tenant_id AND ar.account_id = job.account_id
          AND ar.analysis_job_id = job.job_id
         WHERE req.tenant_id = ? AND req.account_id = ?
           AND req.logical_identity_sha256 = ?`,
      )
      .get(input.tenantId, input.accountId, logicalIdentitySha256) as
      | { readonly analysis_revision_id: string }
      | undefined;
    if (logicallyExisting !== undefined) {
      return this.inTransaction(() => {
        this.insertIdempotency(
          input.tenantId,
          input.accountId,
          "analyze_material",
          input.materialId,
          input.idempotencyKey,
          payloadSha256,
          logicallyExisting.analysis_revision_id,
          new Date().toISOString(),
        );
        return this.getAnalysisRevision(
          input.tenantId,
          input.accountId,
          logicallyExisting.analysis_revision_id,
        );
      });
    }

    const analysis = analyzeDeterministically(version.body);
    return this.inTransaction(() => {
      const now = new Date().toISOString();
      const material = this.getMaterialState(
        input.tenantId,
        input.accountId,
        input.materialId,
      );
      const revisionNo = material.current_analysis_revision + 1;
      const requestId = prefixedId("arq");
      const jobId = prefixedId("ajob");
      const analysisRevisionId = prefixedId("ar");
      const status = analysis.summary.unknownKinds.length === 0 ? "completed" : "uncertain";
      const resultSha256 = sha256(canonicalJson(analysis));
      const previous = this.database
        .prepare(
          `SELECT analysis_revision_id FROM analysis_revisions
           WHERE tenant_id = ? AND account_id = ? AND material_id = ?
           ORDER BY revision_no DESC LIMIT 1`,
        )
        .get(input.tenantId, input.accountId, input.materialId) as
        | { readonly analysis_revision_id: string }
        | undefined;

      this.database
        .prepare(
          `INSERT INTO analysis_requests (
            tenant_id, account_id, request_id, material_id, material_version_id,
            material_version_sha256, classification_decision_id, rule_bundle_id,
            rule_bundle_version, rule_bundle_sha256, public_snapshot_id,
            public_snapshot_sha256, processor_permit_revision, payload_sha256,
            logical_identity_sha256, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NONE', ?, ?, ?)`,
        )
        .run(
          input.tenantId,
          input.accountId,
          requestId,
          input.materialId,
          input.materialVersionId,
          version.bodySha256,
          decision.decisionId,
          ANALYSIS_RULE_BUNDLE.id,
          ANALYSIS_RULE_BUNDLE.version,
          ANALYSIS_RULE_BUNDLE.sha256,
          input.publicSnapshot?.snapshotId ?? null,
          input.publicSnapshot?.manifestSha256 ?? null,
          payloadSha256,
          logicalIdentitySha256,
          now,
        );
      this.database
        .prepare(
          `INSERT INTO analysis_jobs (
            tenant_id, account_id, job_id, request_id, status, status_revision,
            fencing_token, created_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        )
        .run(input.tenantId, input.accountId, jobId, requestId, status, now, now);
      for (const stepKind of ["extract", "relations", "summary"] as const) {
        this.database
          .prepare(
            `INSERT INTO analysis_step_attempts (
              tenant_id, account_id, attempt_id, job_id, step_kind, attempt_no,
              input_sha256, rule_revision, outcome, result_sha256,
              started_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            input.tenantId,
            input.accountId,
            prefixedId("aattempt"),
            jobId,
            stepKind,
            version.bodySha256,
            ANALYSIS_RULE_BUNDLE.version,
            status,
            sha256(`${stepKind}|${resultSha256}`),
            now,
            now,
          );
      }
      this.database
        .prepare(
          `INSERT INTO analysis_revisions (
            tenant_id, account_id, analysis_revision_id, material_id,
            material_version_id, material_version_sha256, classification_decision_id,
            analysis_job_id, revision_no, rule_bundle_id, rule_bundle_version,
            rule_bundle_sha256, public_snapshot_id, public_snapshot_sha256,
            structured_summary_json, result_sha256, supersedes_revision_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.tenantId,
          input.accountId,
          analysisRevisionId,
          input.materialId,
          input.materialVersionId,
          version.bodySha256,
          decision.decisionId,
          jobId,
          revisionNo,
          ANALYSIS_RULE_BUNDLE.id,
          ANALYSIS_RULE_BUNDLE.version,
          ANALYSIS_RULE_BUNDLE.sha256,
          input.publicSnapshot?.snapshotId ?? null,
          input.publicSnapshot?.manifestSha256 ?? null,
          canonicalJson(analysis.summary),
          resultSha256,
          previous?.analysis_revision_id ?? null,
          now,
        );
      analysis.findings.forEach((finding, ordinal) => {
        const findingId = prefixedId("finding");
        this.database
          .prepare(
            `INSERT INTO analysis_findings (
              tenant_id, account_id, finding_id, analysis_revision_id, ordinal,
              finding_kind, label, fact_layer, confidence, rule_revision
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            input.tenantId,
            input.accountId,
            findingId,
            analysisRevisionId,
            ordinal,
            finding.kind,
            finding.label,
            finding.factLayer,
            finding.confidence,
            ANALYSIS_RULE_BUNDLE.version,
          );
        if (
          finding.startCodepoint !== null &&
          finding.endCodepoint !== null &&
          finding.snippet !== null
        ) {
          this.database
            .prepare(
              `INSERT INTO analysis_evidence (
                tenant_id, account_id, evidence_id, finding_id, material_version_id,
                material_version_sha256, start_codepoint, end_codepoint, snippet,
                relation, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              input.tenantId,
              input.accountId,
              prefixedId("evidence"),
              findingId,
              input.materialVersionId,
              version.bodySha256,
              finding.startCodepoint,
              finding.endCodepoint,
              finding.snippet,
              finding.relation,
              now,
            );
        }
      });
      this.database
        .prepare(
          `UPDATE materials
           SET current_analysis_revision = ?, updated_at = ?
           WHERE tenant_id = ? AND account_id = ? AND material_id = ?`,
        )
        .run(revisionNo, now, input.tenantId, input.accountId, input.materialId);
      this.insertIdempotency(
        input.tenantId,
        input.accountId,
        "analyze_material",
        input.materialId,
        input.idempotencyKey,
        payloadSha256,
        analysisRevisionId,
        now,
      );
      this.insertSyncChange(
        input.tenantId,
        input.accountId,
        "analysis_revision",
        analysisRevisionId,
        revisionNo,
        input.idempotencyKey,
        { materialId: input.materialId, revisionNo, status },
        now,
      );
      return this.getAnalysisRevision(
        input.tenantId,
        input.accountId,
        analysisRevisionId,
      );
    });
  }

  public getHistory(
    tenantId: string,
    accountId: string,
    materialId: string,
  ): MaterialHistoryRecord {
    const material = this.getMaterialState(tenantId, accountId, materialId);
    const versionRows = this.database
      .prepare(
        `SELECT * FROM material_versions
         WHERE tenant_id = ? AND account_id = ? AND material_id = ?
         ORDER BY version_no`,
      )
      .all(tenantId, accountId, materialId) as unknown as readonly MaterialVersionRow[];
    const decisionRows = this.database
      .prepare(
        `SELECT * FROM classification_decision_revisions
         WHERE tenant_id = ? AND account_id = ? AND material_id = ?
         ORDER BY revision_no`,
      )
      .all(tenantId, accountId, materialId) as unknown as readonly ClassificationDecisionRow[];
    const analysisRows = this.database
      .prepare(
        `SELECT ar.*, job.status
         FROM analysis_revisions ar
         JOIN analysis_jobs job
           ON job.tenant_id = ar.tenant_id AND job.account_id = ar.account_id
          AND job.job_id = ar.analysis_job_id
         WHERE ar.tenant_id = ? AND ar.account_id = ? AND ar.material_id = ?
         ORDER BY ar.revision_no`,
      )
      .all(tenantId, accountId, materialId) as unknown as readonly AnalysisRevisionRow[];

    return Object.freeze({
      materialId,
      currentVersionNo: material.current_version_no,
      currentClassificationRevision: material.current_classification_revision,
      currentAnalysisRevision: material.current_analysis_revision,
      versions: Object.freeze(
        versionRows.map((row) => {
          const version = materialVersionFromRow(row, this.encryptionKey);
          const { body: _body, ...safeVersion } = version;
          return Object.freeze(safeVersion);
        }),
      ),
      classifications: Object.freeze(
        decisionRows.map((row) => Object.freeze(classificationDecisionFromRow(row))),
      ),
      analyses: Object.freeze(
        analysisRows.map((row) => this.analysisRevisionFromRow(row)),
      ),
    });
  }

  public listHistories(
    tenantId: string,
    accountId: string,
  ): readonly MaterialHistoryRecord[] {
    validateIdentifier(tenantId, "tenantId");
    validateIdentifier(accountId, "accountId");
    const rows = this.database
      .prepare(
        `SELECT material_id
         FROM materials
         WHERE tenant_id = ? AND account_id = ?
         ORDER BY updated_at DESC, material_id`,
      )
      .all(tenantId, accountId) as unknown as readonly {
        readonly material_id: string;
      }[];
    return Object.freeze(
      rows.map((row) => this.getHistory(tenantId, accountId, row.material_id)),
    );
  }

  private getMaterialState(tenantId: string, accountId: string, materialId: string) {
    const row = this.database
      .prepare(
        `SELECT current_version_no, current_classification_revision, current_analysis_revision
         FROM materials WHERE tenant_id = ? AND account_id = ? AND material_id = ?`,
      )
      .get(tenantId, accountId, materialId) as
      | {
          readonly current_version_no: number;
          readonly current_classification_revision: number;
          readonly current_analysis_revision: number;
        }
      | undefined;
    if (row === undefined) {
      throw new MaterialAnalysisContractError(
        "MATERIAL_NOT_FOUND",
        "material does not exist for this account",
      );
    }
    return row;
  }

  private getClassificationSuggestion(
    tenantId: string,
    accountId: string,
    suggestionId: string,
  ): ClassificationSuggestionRecord {
    const row = this.database
      .prepare(
        `SELECT suggestion.*, request.material_id, request.material_version_id
         FROM classification_suggestions suggestion
         JOIN classification_requests request
           ON request.tenant_id = suggestion.tenant_id
          AND request.account_id = suggestion.account_id
          AND request.request_id = suggestion.request_id
         WHERE suggestion.tenant_id = ? AND suggestion.account_id = ?
           AND suggestion.suggestion_id = ?`,
      )
      .get(tenantId, accountId, suggestionId) as ClassificationSuggestionRow | undefined;
    if (row === undefined) {
      throw new MaterialAnalysisContractError(
        "MATERIAL_NOT_FOUND",
        "classification suggestion does not exist",
      );
    }
    return Object.freeze({
      suggestionId: row.suggestion_id,
      requestId: row.request_id,
      materialId: row.material_id,
      materialVersionId: row.material_version_id,
      sourceChannel: row.source_channel,
      contentType: row.content_type,
      basis: Object.freeze(JSON.parse(row.basis_json) as string[]),
      confidence: row.confidence,
      ruleRevision: row.rule_revision,
      status: "awaiting_confirmation",
      createdAt: row.created_at,
    });
  }

  private getClassificationDecision(
    tenantId: string,
    accountId: string,
    decisionId: string,
  ): ClassificationDecisionRecord {
    const row = this.database
      .prepare(
        `SELECT * FROM classification_decision_revisions
         WHERE tenant_id = ? AND account_id = ? AND decision_id = ?`,
      )
      .get(tenantId, accountId, decisionId) as ClassificationDecisionRow | undefined;
    if (row === undefined) {
      throw new MaterialAnalysisContractError(
        "CLASSIFICATION_REQUIRED",
        "classification decision does not exist for this account",
      );
    }
    return Object.freeze(classificationDecisionFromRow(row));
  }

  private getAnalysisRevision(
    tenantId: string,
    accountId: string,
    analysisRevisionId: string,
  ): AnalysisRevisionRecord {
    const row = this.database
      .prepare(
        `SELECT ar.*, job.status
         FROM analysis_revisions ar
         JOIN analysis_jobs job
           ON job.tenant_id = ar.tenant_id AND job.account_id = ar.account_id
          AND job.job_id = ar.analysis_job_id
         WHERE ar.tenant_id = ? AND ar.account_id = ?
           AND ar.analysis_revision_id = ?`,
      )
      .get(tenantId, accountId, analysisRevisionId) as AnalysisRevisionRow | undefined;
    if (row === undefined) {
      throw new MaterialAnalysisContractError(
        "HISTORICAL_REFERENCE_MISMATCH",
        "analysis revision does not exist for this account",
      );
    }
    return this.analysisRevisionFromRow(row);
  }

  private analysisRevisionFromRow(row: AnalysisRevisionRow): AnalysisRevisionRecord {
    const findingRows = this.database
      .prepare(
        `SELECT finding.*, evidence.evidence_id, evidence.start_codepoint,
                evidence.end_codepoint, evidence.snippet, evidence.relation
         FROM analysis_findings finding
         LEFT JOIN analysis_evidence evidence
           ON evidence.tenant_id = finding.tenant_id
          AND evidence.account_id = finding.account_id
          AND evidence.finding_id = finding.finding_id
         WHERE finding.tenant_id = ? AND finding.account_id = ?
           AND finding.analysis_revision_id = ?
         ORDER BY finding.ordinal`,
      )
      .all(row.tenant_id, row.account_id, row.analysis_revision_id) as unknown as readonly AnalysisFindingRow[];
    const findings = findingRows.map((finding): AnalysisFindingRecord =>
      Object.freeze({
        findingId: finding.finding_id,
        kind: finding.finding_kind,
        label: finding.label,
        factLayer: finding.fact_layer,
        confidence: finding.confidence,
        ruleRevision: finding.rule_revision,
        evidence:
          finding.evidence_id === null ||
          finding.start_codepoint === null ||
          finding.end_codepoint === null ||
          finding.snippet === null ||
          finding.relation === null
            ? null
            : Object.freeze({
                evidenceId: finding.evidence_id,
                startCodepoint: finding.start_codepoint,
                endCodepoint: finding.end_codepoint,
                snippet: finding.snippet,
                relation: finding.relation,
              }),
      }),
    );
    return Object.freeze({
      analysisRevisionId: row.analysis_revision_id,
      analysisJobId: row.analysis_job_id,
      materialId: row.material_id,
      materialVersionId: row.material_version_id,
      materialVersionSha256: row.material_version_sha256,
      classificationDecisionId: row.classification_decision_id,
      revisionNo: row.revision_no,
      status: row.status,
      ruleBundleId: row.rule_bundle_id,
      ruleBundleVersion: row.rule_bundle_version,
      ruleBundleSha256: row.rule_bundle_sha256,
      publicSnapshotId: row.public_snapshot_id,
      publicSnapshotSha256: row.public_snapshot_sha256,
      resultSha256: row.result_sha256,
      summary: Object.freeze(JSON.parse(row.structured_summary_json)),
      findings: Object.freeze(findings),
      createdAt: row.created_at,
    }) as AnalysisRevisionRecord;
  }

  private readIdempotency(
    tenantId: string,
    accountId: string,
    operationKind: string,
    resourceId: string,
    idempotencyKey: string,
    payloadSha256: string,
  ): IdempotencyRow | null {
    const row = this.database
      .prepare(
        `SELECT payload_sha256, response_resource_id FROM operation_idempotency
         WHERE tenant_id = ? AND account_id = ? AND operation_kind = ?
           AND resource_id = ? AND idempotency_key = ?`,
      )
      .get(tenantId, accountId, operationKind, resourceId, idempotencyKey) as
      | IdempotencyRow
      | undefined;
    if (row === undefined) {
      return null;
    }
    if (row.payload_sha256 !== payloadSha256) {
      throw new MaterialAnalysisContractError(
        "IDEMPOTENCY_KEY_REUSED",
        "idempotency key was already used with a different payload",
      );
    }
    return row;
  }

  private insertIdempotency(
    tenantId: string,
    accountId: string,
    operationKind: string,
    resourceId: string,
    idempotencyKey: string,
    payloadSha256: string,
    responseResourceId: string,
    createdAt: string,
  ): void {
    this.database
      .prepare(
        `INSERT INTO operation_idempotency (
          tenant_id, account_id, operation_kind, resource_id, idempotency_key,
          payload_sha256, response_resource_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        tenantId,
        accountId,
        operationKind,
        resourceId,
        idempotencyKey,
        payloadSha256,
        responseResourceId,
        createdAt,
      );
  }

  private insertSyncChange(
    tenantId: string,
    accountId: string,
    resourceType: string,
    resourceId: string,
    revisionNo: number,
    operationId: string,
    safeDelta: Readonly<Record<string, unknown>>,
    createdAt: string,
  ): void {
    this.database
      .prepare(
        `INSERT INTO sync_changes (
          tenant_id, account_id, resource_type, resource_id, revision_no,
          operation_id, safe_delta_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        tenantId,
        accountId,
        resourceType,
        resourceId,
        revisionNo,
        operationId,
        canonicalJson(safeDelta),
        createdAt,
      );
  }

  private inTransaction<T>(operation: () => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        this.database.exec("ROLLBACK");
      } catch {
        // Preserve the original error.
      }
      throw error;
    }
  }
}

function materialVersionFromRow(
  row: MaterialVersionRow,
  key: Buffer,
): MaterialVersionRecord {
  const body = decryptBody(
    row.body_ciphertext,
    row.body_nonce,
    row.body_auth_tag,
    key,
    aadFor(row.tenant_id, row.account_id, row.material_id, row.version_id),
  );
  if (sha256(body) !== row.body_sha256) {
    throw new MaterialAnalysisContractError(
      "HISTORICAL_REFERENCE_MISMATCH",
      "decrypted material version hash does not match stored identity",
    );
  }
  return Object.freeze({
    tenantId: row.tenant_id,
    accountId: row.account_id,
    materialId: row.material_id,
    versionId: row.version_id,
    versionNo: row.version_no,
    body,
    bodySha256: row.body_sha256,
    unicodeCount: row.unicode_count,
    metadata: Object.freeze(JSON.parse(row.metadata_json) as MaterialMetadata),
    createdAt: row.created_at,
  });
}

function classificationDecisionFromRow(
  row: ClassificationDecisionRow,
): ClassificationDecisionRecord {
  return {
    decisionId: row.decision_id,
    materialId: row.material_id,
    materialVersionId: row.material_version_id,
    revisionNo: row.revision_no,
    sourceChannel: row.source_channel,
    contentType: row.content_type,
    factLayer: row.fact_layer,
    createdAt: row.created_at,
  };
}

function encryptBody(body: string, key: Buffer, aad: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  return {
    ciphertext,
    nonce,
    authTag: cipher.getAuthTag(),
  };
}

function decryptBody(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  authTag: Uint8Array,
  key: Buffer,
  aad: string,
): string {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(Buffer.from(authTag));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new MaterialAnalysisContractError(
      "HISTORICAL_REFERENCE_MISMATCH",
      "material ciphertext authentication failed",
    );
  }
}

function aadFor(
  tenantId: string,
  accountId: string,
  materialId: string,
  versionId: string,
): string {
  return `${tenantId}|${accountId}|${materialId}|${versionId}`;
}

function validateBody(body: string): number {
  if (hasUnpairedSurrogate(body)) {
    throw new MaterialAnalysisContractError(
      "INVALID_UNICODE",
      "material body contains an unpaired UTF-16 surrogate",
    );
  }
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    throw new MaterialAnalysisContractError("EMPTY_INPUT", "material body is empty");
  }
  if (/^(?:https?:\/\/|www\.)\S+$/iu.test(trimmed)) {
    throw new MaterialAnalysisContractError(
      "URL_ONLY_INPUT",
      "a URL without user-provided text is not accepted and will not be fetched",
    );
  }
  const unicodeCount = Array.from(body).length;
  if (unicodeCount > 100_000) {
    throw new MaterialAnalysisContractError(
      "INPUT_TOO_LARGE",
      "material body exceeds 100000 Unicode code points",
    );
  }
  return unicodeCount;
}

function hasUnpairedSurrogate(input: string): boolean {
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= input.length) {
        return true;
      }
      const next = input.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function validateIdentifier(value: string, label: string): void {
  if (value.length < 1 || value.length > 128 || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u.test(value)) {
    throw new MaterialAnalysisContractError(
      "STORAGE_NOT_READY",
      `${label} must be a safe identifier from 1 to 128 characters`,
    );
  }
}

function validateIdempotencyKey(value: string): void {
  const containsControlCharacter = Array.from(value).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f;
  });
  if (value.length < 8 || value.length > 200 || containsControlCharacter) {
    throw new MaterialAnalysisContractError(
      "STORAGE_NOT_READY",
      "idempotency key must contain 8 to 200 printable characters",
    );
  }
}

function prefixedId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function sha256(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalJson(input: unknown): string {
  return JSON.stringify(canonicalValue(input));
}

function canonicalValue(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(canonicalValue);
  }
  if (typeof input === "object" && input !== null) {
    return Object.fromEntries(
      Object.entries(input)
        .filter(([, value]) => value !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, canonicalValue(value)]),
    );
  }
  return input;
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown SQLite error";
}
