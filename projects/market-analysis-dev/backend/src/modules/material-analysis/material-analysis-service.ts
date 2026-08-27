import type {
  AnalysisRevisionRecord,
  AnalyzeMaterialInput,
  ClassificationDecisionRecord,
  ConfirmClassificationInput,
  MaterialHistoryRecord,
  MaterialVersionRecord,
  SaveMaterialVersionInput,
} from "../../contracts/material-analysis";
import type {
  ClassifyMaterialInput,
  MaterialAnalysisStore,
} from "../../infrastructure/sqlite/materials/material-analysis-store";

export class MaterialAnalysisService {
  public constructor(
    private readonly store: MaterialAnalysisStore,
    readonly tenantId: string,
    readonly accountId: string,
  ) {}

  public save(
    input: Omit<SaveMaterialVersionInput, "tenantId" | "accountId" | "idempotencyKey">,
    idempotencyKey: string,
  ): MaterialVersionRecord {
    return this.store.saveMaterialVersion({
      ...input,
      tenantId: this.tenantId,
      accountId: this.accountId,
      idempotencyKey,
    });
  }

  public version(versionId: string): MaterialVersionRecord {
    return this.store.getMaterialVersion(this.tenantId, this.accountId, versionId);
  }

  public histories(): readonly MaterialHistoryRecord[] {
    return this.store.listHistories(this.tenantId, this.accountId);
  }

  public history(materialId: string): MaterialHistoryRecord {
    return this.store.getHistory(this.tenantId, this.accountId, materialId);
  }

  public classify(
    input: Omit<ClassifyMaterialInput, "tenantId" | "accountId" | "idempotencyKey">,
    idempotencyKey: string,
  ) {
    return this.store.classifyMaterial({
      ...input,
      tenantId: this.tenantId,
      accountId: this.accountId,
      idempotencyKey,
    });
  }

  public confirm(
    input: Omit<ConfirmClassificationInput, "tenantId" | "accountId">,
  ): ClassificationDecisionRecord {
    try {
      return this.store.confirmClassification({
        ...input,
        tenantId: this.tenantId,
        accountId: this.accountId,
      });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "REVISION_CONFLICT") {
        const existing = this.history(input.materialId).classifications.find(
          (decision) =>
            decision.revisionNo === input.expectedBaseRevision + 1 &&
            decision.materialVersionId === input.materialVersionId &&
            decision.sourceChannel === input.sourceChannel &&
            decision.contentType === input.contentType,
        );
        if (existing !== undefined) return existing;
      }
      throw error;
    }
  }

  public analyze(
    input: Omit<AnalyzeMaterialInput, "tenantId" | "accountId" | "idempotencyKey">,
    idempotencyKey: string,
  ): AnalysisRevisionRecord {
    return this.store.analyzeMaterial({
      ...input,
      tenantId: this.tenantId,
      accountId: this.accountId,
      idempotencyKey,
    });
  }

  public analysis(materialId: string, analysisRevisionId: string): AnalysisRevisionRecord {
    const analysis = this.history(materialId).analyses.find(
      (candidate) => candidate.analysisRevisionId === analysisRevisionId,
    );
    if (analysis === undefined) {
      const error = new Error("analysis revision does not exist for this account");
      Object.assign(error, { code: "MATERIAL_VERSION_NOT_FOUND" });
      throw error;
    }
    return analysis;
  }
}
