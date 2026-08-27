import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileText,
  Info,
  LockKeyhole,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Tags,
  Trash2,
} from 'lucide-react'
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  careerApi,
  createMaterialId,
  type AnalysisRevision,
  type ClassificationSuggestion,
  type MaterialHistory,
  type MaterialVersion,
} from '../../api/career'
import {
  MAX_SOURCE_CHARACTERS,
  createPlainTextPreview,
  validateSourceInput,
} from '../../domain/source-analysis/sourceInput'
import styles from './SourceWorkbenchPage.module.css'

type WorkbenchStage = 'editing' | 'classification-review' | 'classification-confirmed'
type FieldError = 'source-body' | 'rights-confirmation' | null

const sourceChannelOptions = [
  { value: 'unknown', label: '未知' },
  { value: 'search_result', label: '搜索引擎结果' },
  { value: 'official_source', label: '公司／机构官方来源' },
  { value: 'recruiting_platform', label: '招聘平台／ATS' },
  { value: 'longform_media', label: '媒体／长文平台' },
  { value: 'research_institution', label: '政府／标准／研究机构' },
  { value: 'professional_network', label: '社区／社交平台' },
  { value: 'user_input', label: '用户输入／个人材料' },
  { value: 'other', label: '其他' },
] as const

const contentTypeOptions = [
  { value: 'unknown', label: '未知' },
  { value: 'article_or_note', label: '行业／技术文章或笔记' },
  { value: 'job_description', label: '招聘职位' },
  { value: 'interview_requirement', label: '面试要求' },
  { value: 'interview_note', label: '面试经验' },
  { value: 'resume', label: '简历／个人证据' },
  { value: 'project_record', label: '项目／案例' },
  { value: 'learning_material', label: '学习资料' },
  { value: 'other', label: '其他' },
] as const

type SourceChannel = (typeof sourceChannelOptions)[number]['value']
type ContentType = (typeof contentTypeOptions)[number]['value']

const workbenchSteps = [
  { number: '1', label: '粘贴内容' },
  { number: '2', label: '确认分类' },
  { number: '3', label: '查看摘要' },
  { number: '4', label: '对照研究' },
] as const

function getActiveStep(stage: WorkbenchStage) {
  if (stage === 'editing') return 1
  if (stage === 'classification-review') return 2
  return 3
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asSourceChannel(value: string): SourceChannel {
  return sourceChannelOptions.find((option) => option.value === value)?.value ?? 'unknown'
}

function asContentType(value: string): ContentType {
  return contentTypeOptions.find((option) => option.value === value)?.value ?? 'unknown'
}

function sourceChannelLabel(value: SourceChannel): string {
  return sourceChannelOptions.find((option) => option.value === value)?.label ?? '未知'
}

function contentTypeLabel(value: ContentType): string {
  return contentTypeOptions.find((option) => option.value === value)?.label ?? '未知'
}

function formatConfidence(value?: number) {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : '未知'
}

const factLayerLabels = {
  'externally-verifiable': '外部可核验事实',
  'user-stated': '用户陈述',
  'system-inference': '系统推断',
  UNKNOWN: '未知',
} as const

function AnalysisResult({ analysis }: { readonly analysis: AnalysisRevision }) {
  return (
    <section className={styles.analysisResult} aria-labelledby="analysis-result-title">
      <div className={styles.sectionHeading}>
        <span className={styles.sectionIcon} aria-hidden="true"><ScanSearch size={22} /></span>
        <div><p>步骤 3</p><h2 id="analysis-result-title">结构化分析结果</h2></div>
      </div>
      <div className={styles.analysisTruth} role="note">
        <strong>{analysis.status === 'completed' ? '分析完成' : '分析存在未知项'}</strong>
        <span>规则版本 {analysis.ruleBundleVersion} · 分析修订 {analysis.revisionNo}</span>
        <p>{analysis.summary.truthNotice}</p>
      </div>
      {analysis.summary.strongestSignals.length ? <div className={styles.signalList}><h3>最强信号</h3><ul>{analysis.summary.strongestSignals.map((signal) => <li key={signal}>{signal}</li>)}</ul></div> : null}
      <div className={styles.findingGrid}>
        {analysis.findings.map((finding) => (
          <article key={finding.findingId}>
            <div><span>{finding.kind}</span><strong>{formatConfidence(finding.confidence)}</strong></div>
            <h3>{finding.label}</h3>
            <p className={styles.factLayer}>{factLayerLabels[finding.factLayer]}</p>
            <p>{finding.evidence?.snippet ?? '没有足够的原文证据片段。'}</p>
            <small>规则 {finding.ruleRevision}{finding.evidence ? ` · 字符 ${finding.evidence.startCodepoint}–${finding.evidence.endCodepoint}` : ''}</small>
          </article>
        ))}
      </div>
      <p className={styles.publicBoundary}>{analysis.publicSnapshotId ? `已对照公共研究快照 ${analysis.publicSnapshotId}` : '公共研究快照未就绪：结果仅基于本次用户材料，不声称代表市场事实。'}</p>
    </section>
  )
}

function HistoryPanel({ items, loading }: { readonly items: readonly MaterialHistory[]; readonly loading: boolean }) {
  return (
    <section className={styles.historyPanel} aria-labelledby="history-title">
      <div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><RotateCcw size={22} /></span><div><p>服务端历史</p><h2 id="history-title">已保存材料与分析版本</h2></div></div>
      {loading ? <p role="status">正在从本地 SQLite 读取历史…</p> : items.length === 0 ? <p>尚无已保存记录，或本地服务暂不可用。</p> : <div className={styles.historyList}>{items.map((item) => {
        const latest = item.analyses.at(-1)
        return <article key={item.materialId}><div><strong>材料 {item.materialId}</strong><span>材料版本 {item.currentVersionNo} · 分类修订 {item.currentClassificationRevision} · 分析修订 {item.currentAnalysisRevision}</span></div>{latest ? <><p>{latest.summary.headline}</p><small>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(latest.createdAt))} · 规则 {latest.ruleBundleVersion}</small></> : <p>已保存正文，尚无完成的分析修订。</p>}</article>
      })}</div>}
    </section>
  )
}

export function SourceWorkbenchPage() {
  const [sourceBody, setSourceBody] = useState('')
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [stage, setStage] = useState<WorkbenchStage>('editing')
  const [fieldError, setFieldError] = useState<FieldError>(null)
  const [liveMessage, setLiveMessage] = useState('')
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [sourceChannel, setSourceChannel] = useState<SourceChannel>('unknown')
  const [contentType, setContentType] = useState<ContentType>('unknown')
  const [busy, setBusy] = useState(false)
  const [serviceError, setServiceError] = useState<string | null>(null)
  const [material, setMaterial] = useState<MaterialVersion | null>(null)
  const [suggestion, setSuggestion] = useState<ClassificationSuggestion | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisRevision | null>(null)
  const [history, setHistory] = useState<readonly MaterialHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const formRef = useRef<HTMLFormElement>(null)
  const sourceBodyRef = useRef<HTMLTextAreaElement>(null)
  const rightsRef = useRef<HTMLInputElement>(null)
  const classificationHeadingRef = useRef<HTMLHeadingElement>(null)
  const confirmedHeadingRef = useRef<HTMLHeadingElement>(null)
  const clearButtonRef = useRef<HTMLButtonElement>(null)
  const cancelClearRef = useRef<HTMLButtonElement>(null)

  const validation = useMemo(() => validateSourceInput(sourceBody), [sourceBody])
  const activeStep = getActiveStep(stage)
  const hasDraft = sourceBody.length > 0 || rightsConfirmed || stage !== 'editing'

  useEffect(() => {
    const previousTitle = document.title
    document.title = '前端职业成长雷达｜信息源工作台'

    return () => {
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    careerApi.history().then((items) => {
      if (!cancelled) setHistory(Array.isArray(items) ? items : [])
    }).catch(() => {
      if (!cancelled) setHistory([])
    }).finally(() => {
      if (!cancelled) setHistoryLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (stage === 'classification-review') {
      classificationHeadingRef.current?.focus()
    }

    if (stage === 'classification-confirmed') {
      confirmedHeadingRef.current?.focus()
    }
  }, [stage])

  useEffect(() => {
    if (clearDialogOpen) {
      cancelClearRef.current?.focus()
    }
  }, [clearDialogOpen])

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setSourceBody(event.target.value)
    setFieldError(null)

    if (stage !== 'editing') {
      setStage('editing')
      setLiveMessage('正文已修改，请重新检查后进入分类确认。')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextValidation = validateSourceInput(sourceBody)

    if (nextValidation.errorCode) {
      setFieldError('source-body')
      setLiveMessage(nextValidation.message ?? '正文校验未通过。')
      sourceBodyRef.current?.focus()
      return
    }

    if (!rightsConfirmed) {
      setFieldError('rights-confirmation')
      setLiveMessage('请先确认你有权将此内容用于个人研究。')
      rightsRef.current?.focus()
      return
    }

    setFieldError(null)
    setServiceError(null)
    setBusy(true)
    setLiveMessage('正在保存到本地私有数据库并生成分类建议。')
    try {
      const formData = new FormData(event.currentTarget)
      const metadata = {
        title: formValue(formData, 'source-title'),
        userProvidedUrl: formValue(formData, 'source-url'),
        publisher: formValue(formData, 'source-publisher'),
        author: formValue(formData, 'source-author'),
        publishedDate: formValue(formData, 'published-date'),
        collectedDate: formValue(formData, 'collected-date'),
        region: formValue(formData, 'source-region'),
        level: formValue(formData, 'source-level'),
        notes: formValue(formData, 'source-notes'),
      }
      const saved = await careerApi.saveMaterial({
        materialId: material?.materialId ?? createMaterialId(),
        body: sourceBody,
        sourceChannel,
        contentType,
        metadata,
        rightsConfirmation: {
          userHasRights: rightsConfirmed,
          sensitiveDataAcknowledged: rightsConfirmed,
        },
      })
      const nextSuggestion = await careerApi.classify(saved.materialId, saved.versionId)
      setMaterial(saved)
      setSuggestion(nextSuggestion)
      setSourceChannel(asSourceChannel(nextSuggestion.sourceChannel))
      setContentType(asContentType(nextSuggestion.contentType))
      setStage('classification-review')
      setLiveMessage(`已保存材料版本 ${saved.versionNo}，请确认服务端分类建议。`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '本地服务处理失败。'
      setServiceError(message)
      setLiveMessage(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleClassificationConfirm() {
    if (!material || !suggestion) return
    setBusy(true)
    setServiceError(null)
    setLiveMessage('正在保存分类确认并运行本地确定性分析。')
    try {
      const decision = await careerApi.confirmClassification({
        materialId: material.materialId,
        versionId: material.versionId,
        sourceChannel,
        contentType,
        expectedRevision: 0,
      })
      const nextAnalysis = await careerApi.analyze({
        materialId: material.materialId,
        versionId: material.versionId,
        classificationDecisionId: decision.decisionId,
      })
      setAnalysis(nextAnalysis)
      setStage('classification-confirmed')
      setLiveMessage('分类与分析已保存，可刷新后从历史记录恢复。')
      const latestHistory = await careerApi.history()
      setHistory(Array.isArray(latestHistory) ? latestHistory : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : '分析失败，已保留已保存的材料版本。'
      setServiceError(message)
      setLiveMessage(message)
    } finally {
      setBusy(false)
    }
  }

  function returnToEditing() {
    setStage('editing')
    setLiveMessage('已返回输入区，正文和元数据仍保留在当前标签页。')
    requestAnimationFrame(() => sourceBodyRef.current?.focus())
  }

  function clearDraft() {
    formRef.current?.reset()
    setSourceBody('')
    setRightsConfirmed(false)
    setStage('editing')
    setFieldError(null)
    setSourceChannel('unknown')
    setContentType('unknown')
    setMaterial(null)
    setSuggestion(null)
    setAnalysis(null)
    setServiceError(null)
    setClearDialogOpen(false)
    setLiveMessage('本次标签页中的输入与分类选择已清空。')
    requestAnimationFrame(() => sourceBodyRef.current?.focus())
  }

  function closeClearDialog() {
    setClearDialogOpen(false)
    requestAnimationFrame(() => clearButtonRef.current?.focus())
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>05 · 信息源工作台</p>
          <h1>把新材料带进职业研究</h1>
          <p className={styles.intro}>
            粘贴正文后保存到本机私有 SQLite，确认双轴分类，并查看带证据片段、置信度和事实分层的结构化分析。
          </p>
        </div>
        <div className={styles.sessionBadge}>
          <LockKeyhole size={18} strokeWidth={1.9} aria-hidden="true" />
          <span>
            <strong>本地私有存储 · 真实服务</strong>
            <small>刷新后可从历史恢复</small>
          </span>
        </div>
      </header>

      <ol className={styles.steps} aria-label="信息源处理步骤">
        {workbenchSteps.map((step) => {
          const stepNumber = Number(step.number)
          const isActive = stepNumber === activeStep
          const isUnavailable = stepNumber > 3

          return (
            <li
              key={step.number}
              className={isActive ? styles.stepActive : ''}
              data-unavailable={isUnavailable || undefined}
              aria-current={isActive ? 'step' : undefined}
            >
              <span>{step.number}</span>
              <strong>{step.label}</strong>
              {isUnavailable ? <small>后续任务</small> : null}
            </li>
          )
        })}
      </ol>

      <div className={styles.truthBoundary} role="note" aria-label="处理与研究边界">
        <span>
          <FileText size={17} strokeWidth={1.9} aria-hidden="true" />
          <strong>获批研究快照 · 只读</strong>
        </span>
        <span aria-hidden="true">≠</span>
        <span>
          <Tags size={17} strokeWidth={1.9} aria-hidden="true" />
          <strong>用户提供 · 私有 SQLite</strong>
        </span>
        <p>个人材料与公共研究保持分域；所有结果标注事实、推断或未知。</p>
      </div>

      <form ref={formRef} className={styles.workspace} onSubmit={handleSubmit} noValidate>
        <section className={styles.inputPanel} aria-labelledby="source-input-title">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <FileText size={22} strokeWidth={1.9} />
            </span>
            <div>
              <p>步骤 1</p>
              <h2 id="source-input-title">粘贴或输入正文</h2>
            </div>
          </div>

          <label className={styles.textareaLabel} htmlFor="source-body">
            粘贴文章、招聘／面试要求、简历、项目材料或其他正文
          </label>
          <p id="source-body-help" className={styles.fieldHelp}>
            1–100,000 个 Unicode 字符；只输入网址不会自动抓取；提交后加密保存到本机私有 SQLite，可从历史恢复。
          </p>
          <div
            className={`${styles.textareaFrame} ${fieldError === 'source-body' ? styles.fieldInvalid : ''}`}
          >
            <textarea
              ref={sourceBodyRef}
              id="source-body"
              name="source-body"
              value={sourceBody}
              onChange={handleBodyChange}
              aria-invalid={fieldError === 'source-body'}
              aria-describedby={`source-body-help source-character-count${fieldError === 'source-body' ? ' source-body-error' : ''}`}
              placeholder="例如：一段招聘要求、技术文章、面试经验或已脱敏的项目材料……"
              rows={13}
              spellCheck={false}
            />
            <div className={styles.textareaFooter}>
              <span>正文按纯文本处理，HTML 不会执行。</span>
              <output
                id="source-character-count"
                className={validation.characterCount > MAX_SOURCE_CHARACTERS ? styles.countError : validation.characterCount >= 90_000 ? styles.countWarning : ''}
                htmlFor="source-body"
              >
                {validation.characterCount.toLocaleString('zh-CN')} / {MAX_SOURCE_CHARACTERS.toLocaleString('zh-CN')}
              </output>
            </div>
          </div>

          {fieldError === 'source-body' ? (
            <p id="source-body-error" className={styles.errorMessage} role="alert">
              <CircleAlert size={17} strokeWidth={2} aria-hidden="true" />
              {validation.message}
            </p>
          ) : null}

          <details className={styles.metadataPanel}>
            <summary>
              <span>
                <Info size={18} strokeWidth={1.9} aria-hidden="true" />
                可选来源元数据
              </span>
              <span>
                补充信息可帮助后续分类
                <ChevronDown size={17} strokeWidth={2} aria-hidden="true" />
              </span>
            </summary>
            <div className={styles.metadataGrid}>
              <label>
                标题
                <input name="source-title" type="text" autoComplete="off" />
              </label>
              <label>
                原始网址
                <input name="source-url" type="text" inputMode="url" autoComplete="off" />
              </label>
              <label>
                来源平台／发布方
                <input name="source-publisher" type="text" autoComplete="off" />
              </label>
              <label>
                作者
                <input name="source-author" type="text" autoComplete="off" />
              </label>
              <label>
                发布日期
                <input name="published-date" type="date" />
              </label>
              <label>
                采集日期
                <input name="collected-date" type="date" />
              </label>
              <label>
                地区
                <input name="source-region" type="text" autoComplete="off" />
              </label>
              <label>
                岗位层级
                <select name="source-level" defaultValue="未披露">
                  <option>未披露</option>
                  <option>初级</option>
                  <option>中级</option>
                  <option>高级</option>
                  <option>Staff／负责人</option>
                  <option>不适用</option>
                </select>
              </label>
              <label className={styles.fullWidthField}>
                用户备注
                <textarea name="source-notes" rows={3} />
              </label>
              <label className={styles.disclosedOption}>
                <input name="published-date-undisclosed" type="checkbox" />
                发布日期未披露；采集日期不会替代发布日期
              </label>
            </div>
          </details>

          <aside className={styles.privacyNotice} aria-labelledby="privacy-title">
            <ShieldCheck size={22} strokeWidth={1.9} aria-hidden="true" />
            <div>
              <h3 id="privacy-title">先脱敏，再处理</h3>
              <p>
                建议先删除姓名、联系方式、证件、详细地址和雇主机密。正文只发送到本机服务并保存于私有 SQLite，不写入网址、浏览器存储、日志、第三方服务或公共研究库。
              </p>
              <small>本地提示不能识别所有敏感信息，请自行复核后再继续。</small>
            </div>
          </aside>

          <div className={`${styles.rightsField} ${fieldError === 'rights-confirmation' ? styles.rightsInvalid : ''}`}>
            <label>
              <input
                ref={rightsRef}
                name="rights-confirmation"
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(event) => {
                  setRightsConfirmed(event.target.checked)
                  setFieldError(null)
                }}
                aria-invalid={fieldError === 'rights-confirmation'}
                aria-describedby={fieldError === 'rights-confirmation' ? 'rights-error' : 'rights-help'}
              />
              <span>
                <strong>我确认有权将此内容用于个人研究</strong>
                <small id="rights-help">提交不代表获得再发布权；内容仅发送到本机私有服务。</small>
              </span>
            </label>
            {fieldError === 'rights-confirmation' ? (
              <p id="rights-error" role="alert">
                请先确认你有权将此内容用于个人研究。
              </p>
            ) : null}
          </div>

          <div className={styles.formActions}>
            <button className={styles.primaryButton} type="submit" disabled={busy}>
              <ScanSearch size={19} strokeWidth={2} aria-hidden="true" />
              {busy ? '正在保存…' : '保存并建议分类'}
            </button>
            <button
              ref={clearButtonRef}
              className={styles.secondaryButton}
              type="button"
              disabled={!hasDraft}
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 size={18} strokeWidth={1.9} aria-hidden="true" />
              清空
            </button>
            <p>提交后会创建不可变材料版本，并由本地确定性规则生成分类建议。</p>
          </div>
          {serviceError ? <p className={styles.errorMessage} role="alert"><CircleAlert size={17} />{serviceError}</p> : null}
        </section>

        {stage !== 'editing' ? (
          <section className={styles.classificationPanel} aria-labelledby="classification-title">
            <div className={styles.previewNotice} role="note">
              <ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />
              <div>
                <strong>材料版本已保存 · 等待分类确认</strong>
                <p>{material ? `版本 ${material.versionNo} · ${material.unicodeCount.toLocaleString('zh-CN')} 字符 · SHA-256 ${material.bodySha256.slice(0, 12)}…` : '正在读取保存结果。'}</p>
              </div>
            </div>

            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon} aria-hidden="true">
                <Tags size={22} strokeWidth={1.9} />
              </span>
              <div>
                <p>步骤 2</p>
                <h2 id="classification-title" ref={classificationHeadingRef} tabIndex={-1}>
                  确认双轴分类
                </h2>
              </div>
            </div>

            <div className={styles.plainTextPreview}>
              <span>纯文本预览</span>
              <pre>{createPlainTextPreview(sourceBody)}</pre>
            </div>

            <div className={styles.classificationGrid}>
              <label>
                来源渠道
                <select
                  value={sourceChannel}
                  onChange={(event) => setSourceChannel(event.target.value as SourceChannel)}
                >
                  {sourceChannelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <small>系统建议：{sourceChannelLabel(asSourceChannel(suggestion?.sourceChannel ?? 'unknown'))} · 置信度：{formatConfidence(suggestion?.confidence)}</small>
              </label>
              <label>
                内容类型
                <select
                  value={contentType}
                  onChange={(event) => setContentType(event.target.value as ContentType)}
                >
                  {contentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <small>识别依据：{suggestion?.basis.join('；') || '规则没有足够依据，保持未知'}</small>
              </label>
            </div>

            {stage === 'classification-review' ? (
              <div className={styles.classificationActions}>
                <button className={styles.primaryButton} type="button" disabled={busy} onClick={() => void handleClassificationConfirm()}>
                  <CheckCircle2 size={19} strokeWidth={2} aria-hidden="true" />
                  {busy ? '正在分析…' : '确认分类并分析'}
                </button>
                <button className={styles.secondaryButton} type="button" onClick={returnToEditing}>
                  <ArrowLeft size={18} strokeWidth={1.9} aria-hidden="true" />
                  返回修改
                </button>
              </div>
            ) : (
              <div className={styles.confirmedState} role="status">
                <CheckCircle2 size={23} strokeWidth={2} aria-hidden="true" />
                <div>
                  <h3 ref={confirmedHeadingRef} tabIndex={-1}>分类与分析已保存</h3>
                  <p>来源渠道：{sourceChannelLabel(sourceChannel)} · 内容类型：{contentTypeLabel(contentType)}</p>
                  <p>{analysis?.summary.headline ?? '服务未返回摘要标题。'}</p>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={returnToEditing}>
                  <RotateCcw size={18} strokeWidth={1.9} aria-hidden="true" />
                  继续修改
                </button>
              </div>
            )}
            {analysis ? <AnalysisResult analysis={analysis} /> : null}
          </section>
        ) : null}
      </form>

      <HistoryPanel items={history} loading={historyLoading} />

      <p className={styles.liveRegion} aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>

      {clearDialogOpen ? (
        <div className={styles.dialogBackdrop}>
          <section
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-dialog-title"
            aria-describedby="clear-dialog-description"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                closeClearDialog()
              }
            }}
          >
            <span className={styles.dialogIcon} aria-hidden="true">
              <AlertTriangle size={24} strokeWidth={2} />
            </span>
            <div>
              <h2 id="clear-dialog-title">清空本次输入？</h2>
              <p id="clear-dialog-description">
                正文、元数据、权利确认和分类选择都会从当前标签页移除。此操作不会影响获批研究快照。
              </p>
            </div>
            <div className={styles.dialogActions}>
              <button ref={cancelClearRef} className={styles.secondaryButton} type="button" onClick={closeClearDialog}>
                取消清空
              </button>
              <button className={styles.dangerButton} type="button" onClick={clearDraft}>
                确认清空
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
