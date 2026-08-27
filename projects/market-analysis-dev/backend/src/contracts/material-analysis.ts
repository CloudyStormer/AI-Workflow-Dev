export const MATERIAL_ANALYSIS_ERROR_CODES = [
  "EMPTY_INPUT",
  "INPUT_TOO_LARGE",
  "INVALID_UNICODE",
  "URL_ONLY_INPUT",
  "RIGHTS_CONFIRMATION_REQUIRED",
  "IDEMPOTENCY_KEY_REUSED",
  "MATERIAL_NOT_FOUND",
  "MATERIAL_VERSION_NOT_FOUND",
  "REVISION_CONFLICT",
  "CLASSIFICATION_REQUIRED",
  "HISTORICAL_REFERENCE_MISMATCH",
  "STORAGE_NOT_READY",
] as const;

export type MaterialAnalysisErrorCode =
  (typeof MATERIAL_ANALYSIS_ERROR_CODES)[number];

export type StorageScope = "private_user" | "ephemeral_user";
export type FindingKind =
  | "skill"
  | "tool"
  | "framework"
  | "responsibility"
  | "project"
  | "outcome"
  | "unknown";
export type FactLayer =
  | "externally-verifiable"
  | "user-stated"
  | "system-inference"
  | "UNKNOWN";

export interface MaterialMetadata {
  readonly sourceChannel?: string;
  readonly contentType?: string;
  readonly title?: string;
  readonly userProvidedUrl?: string;
  readonly locale?: string;
  readonly timezone?: string;
}

export interface SaveMaterialVersionInput {
  readonly tenantId: string;
  readonly accountId: string;
  readonly materialId: string;
  readonly body: string;
  readonly storageScope: StorageScope;
  readonly metadata: MaterialMetadata;
  readonly rightsConfirmation: {
    readonly userHasRights: true;
    readonly sensitiveDataAcknowledged: boolean;
    readonly policyRevision: string;
  };
  readonly idempotencyKey: string;
}

export interface MaterialVersionRecord {
  readonly tenantId: string;
  readonly accountId: string;
  readonly materialId: string;
  readonly versionId: string;
  readonly versionNo: number;
  readonly body: string;
  readonly bodySha256: string;
  readonly unicodeCount: number;
  readonly metadata: MaterialMetadata;
  readonly createdAt: string;
}

export interface ClassificationSuggestionRecord {
  readonly suggestionId: string;
  readonly requestId: string;
  readonly materialId: string;
  readonly materialVersionId: string;
  readonly sourceChannel: string;
  readonly contentType: string;
  readonly basis: readonly string[];
  readonly confidence: number;
  readonly ruleRevision: string;
  readonly status: "awaiting_confirmation";
  readonly createdAt: string;
}

export interface ConfirmClassificationInput {
  readonly tenantId: string;
  readonly accountId: string;
  readonly materialId: string;
  readonly materialVersionId: string;
  readonly sourceChannel: string;
  readonly contentType: string;
  readonly expectedBaseRevision: number;
  readonly reason: string;
}

export interface ClassificationDecisionRecord {
  readonly decisionId: string;
  readonly materialId: string;
  readonly materialVersionId: string;
  readonly revisionNo: number;
  readonly sourceChannel: string;
  readonly contentType: string;
  readonly factLayer: "user-confirmed";
  readonly createdAt: string;
}

export interface AnalysisFindingRecord {
  readonly findingId: string;
  readonly kind: FindingKind;
  readonly label: string;
  readonly factLayer: FactLayer;
  readonly confidence: number;
  readonly ruleRevision: string;
  readonly evidence:
    | {
        readonly evidenceId: string;
        readonly startCodepoint: number;
        readonly endCodepoint: number;
        readonly snippet: string;
        readonly relation: "supports" | "insufficient";
      }
    | null;
}

export interface AnalysisSummary {
  readonly headline: string;
  readonly counts: Readonly<Record<FindingKind, number>>;
  readonly strongestSignals: readonly string[];
  readonly unknownKinds: readonly FindingKind[];
  readonly truthNotice: string;
}

export interface AnalyzeMaterialInput {
  readonly tenantId: string;
  readonly accountId: string;
  readonly materialId: string;
  readonly materialVersionId: string;
  readonly classificationDecisionId: string;
  readonly idempotencyKey: string;
  readonly publicSnapshot?: {
    readonly snapshotId: string;
    readonly manifestSha256: string;
  };
}

export interface AnalysisRevisionRecord {
  readonly analysisRevisionId: string;
  readonly analysisJobId: string;
  readonly materialId: string;
  readonly materialVersionId: string;
  readonly materialVersionSha256: string;
  readonly classificationDecisionId: string;
  readonly revisionNo: number;
  readonly status: "completed" | "uncertain";
  readonly ruleBundleId: string;
  readonly ruleBundleVersion: string;
  readonly ruleBundleSha256: string;
  readonly publicSnapshotId: string | null;
  readonly publicSnapshotSha256: string | null;
  readonly resultSha256: string;
  readonly summary: AnalysisSummary;
  readonly findings: readonly AnalysisFindingRecord[];
  readonly createdAt: string;
}

export interface MaterialHistoryRecord {
  readonly materialId: string;
  readonly currentVersionNo: number;
  readonly currentClassificationRevision: number;
  readonly currentAnalysisRevision: number;
  readonly versions: readonly Omit<MaterialVersionRecord, "body">[];
  readonly classifications: readonly ClassificationDecisionRecord[];
  readonly analyses: readonly AnalysisRevisionRecord[];
}

export class MaterialAnalysisContractError extends Error {
  public constructor(
    public readonly code: MaterialAnalysisErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MaterialAnalysisContractError";
  }
}
