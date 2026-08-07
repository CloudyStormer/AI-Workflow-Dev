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
  MAX_SOURCE_CHARACTERS,
  createPlainTextPreview,
  validateSourceInput,
} from '../../domain/source-analysis/sourceInput'
import styles from './SourceWorkbenchPage.module.css'

type WorkbenchStage = 'editing' | 'classification-review' | 'classification-confirmed'
type FieldError = 'source-body' | 'rights-confirmation' | null

const sourceChannelOptions = [
  '未知',
  '搜索引擎结果',
  '公司／机构官方来源',
  '招聘平台／ATS',
  '媒体／长文平台',
  '政府／标准／研究机构',
  '社区／社交平台',
  '用户简历／个人材料',
  '其他',
] as const

const contentTypeOptions = [
  '未知',
  '行业／技术文章',
  '招聘职位',
  '面试要求',
  '面试经验',
  '简历／个人证据',
  '项目／案例',
  '学习资料',
  '其他',
] as const

const workbenchSteps = [
  { number: '1', label: '粘贴内容' },
  { number: '2', label: '确认分类' },
  { number: '3', label: '查看摘要' },
  { number: '4', label: '对照研究' },
] as const

function getActiveStep(stage: WorkbenchStage) {
  return stage === 'editing' ? 1 : 2
}

export function SourceWorkbenchPage() {
  const [sourceBody, setSourceBody] = useState('')
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [stage, setStage] = useState<WorkbenchStage>('editing')
  const [fieldError, setFieldError] = useState<FieldError>(null)
  const [liveMessage, setLiveMessage] = useState('')
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [sourceChannel, setSourceChannel] = useState<(typeof sourceChannelOptions)[number]>('未知')
  const [contentType, setContentType] = useState<(typeof contentTypeOptions)[number]>('未知')

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    setStage('classification-review')
    setLiveMessage('输入校验已通过，已进入分类确认界面。')
  }

  function handleClassificationConfirm() {
    setStage('classification-confirmed')
    setLiveMessage('分类已在当前标签页确认；本地整合引擎尚未启用。')
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
    setSourceChannel('未知')
    setContentType('未知')
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
            先粘贴正文并确认分类。当前只开放输入、校验与分类确认预览，不会生成摘要、新方向或外部分析结果。
          </p>
        </div>
        <div className={styles.sessionBadge}>
          <LockKeyhole size={18} strokeWidth={1.9} aria-hidden="true" />
          <span>
            <strong>用户提供 · 本次标签页</strong>
            <small>刷新或关闭后不恢复</small>
          </span>
        </div>
      </header>

      <ol className={styles.steps} aria-label="信息源处理步骤">
        {workbenchSteps.map((step) => {
          const stepNumber = Number(step.number)
          const isActive = stepNumber === activeStep
          const isUnavailable = stepNumber > 2

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
          <strong>用户提供 · 本次标签页</strong>
        </span>
        <p>两类内容不会静默合并；本批尚未启用整合结果。</p>
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
            1–100,000 个 Unicode 字符；只输入网址不会自动抓取；默认不长期保存。
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
                建议先删除姓名、联系方式、证件、详细地址和雇主机密。正文只保留在当前 React 标签页内存，不会写入网址、浏览器存储、缓存、日志或网络请求。
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
                <small id="rights-help">提交不代表获得再发布权；当前不会把内容发送给第三方。</small>
              </span>
            </label>
            {fieldError === 'rights-confirmation' ? (
              <p id="rights-error" role="alert">
                请先确认你有权将此内容用于个人研究。
              </p>
            ) : null}
          </div>

          <div className={styles.formActions}>
            <button className={styles.primaryButton} type="submit">
              <ScanSearch size={19} strokeWidth={2} aria-hidden="true" />
              分析并建议分类
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
            <p>本按钮当前只进行本地校验并打开分类确认 UI，不运行整合引擎。</p>
          </div>
        </section>

        {stage !== 'editing' ? (
          <section className={styles.classificationPanel} aria-labelledby="classification-title">
            <div className={styles.previewNotice} role="note">
              <AlertTriangle size={20} strokeWidth={2} aria-hidden="true" />
              <div>
                <strong>本地整合引擎尚未启用</strong>
                <p>当前不会自动分类、生成摘要或整合出新方向。两个分类字段默认“未知”，你可以手动确认本次会话的分类。</p>
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
                  onChange={(event) => setSourceChannel(event.target.value as (typeof sourceChannelOptions)[number])}
                >
                  {sourceChannelOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
                <small>系统建议：未运行 · 置信度：未运行</small>
              </label>
              <label>
                内容类型
                <select
                  value={contentType}
                  onChange={(event) => setContentType(event.target.value as (typeof contentTypeOptions)[number])}
                >
                  {contentTypeOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
                <small>识别依据：本地整合引擎属于后续任务</small>
              </label>
            </div>

            {stage === 'classification-review' ? (
              <div className={styles.classificationActions}>
                <button className={styles.primaryButton} type="button" onClick={handleClassificationConfirm}>
                  <CheckCircle2 size={19} strokeWidth={2} aria-hidden="true" />
                  确认本次分类
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
                  <h3 ref={confirmedHeadingRef} tabIndex={-1}>分类已在本次标签页确认</h3>
                  <p>来源渠道：{sourceChannel} · 内容类型：{contentType}</p>
                  <p>摘要、六类研究关系和新方向整合仍未启用，也没有任何内容被发送或保存。</p>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={returnToEditing}>
                  <RotateCcw size={18} strokeWidth={1.9} aria-hidden="true" />
                  继续修改
                </button>
              </div>
            )}
          </section>
        ) : null}
      </form>

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
