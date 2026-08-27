import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SourceWorkbenchPage } from './SourceWorkbenchPage'

const sourceLabel = '粘贴文章、招聘／面试要求、简历、项目材料或其他正文'

function json(payload: unknown) {
  return new Response(JSON.stringify({ data: payload }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function mockApi() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/v1/history')) return json([])
    if (url.endsWith('/api/v1/materials') && init?.method === 'POST') return json({ materialId: 'material-1', versionId: 'version-1', versionNo: 1, bodySha256: 'abcdef1234567890', unicodeCount: 31, createdAt: '2026-08-27T10:00:00Z', metadata: {} })
    if (url.endsWith('/api/v1/materials/material-1:classify')) return json({ suggestionId: 'suggestion-1', materialId: 'material-1', materialVersionId: 'version-1', sourceChannel: 'recruiting_platform', contentType: 'job_description', basis: ['检测到招聘要求'], confidence: 0.91, ruleRevision: 'career-rule-1', status: 'awaiting_confirmation' })
    if (url.endsWith('/api/v1/materials/material-1/classification')) return json({ decisionId: 'decision-1', revisionNo: 1, sourceChannel: 'recruiting_platform', contentType: 'job_description', createdAt: '2026-08-27T10:01:00Z' })
    if (url.endsWith('/api/v1/materials/material-1:analyze')) return json({ analysisRevisionId: 'analysis-1', materialId: 'material-1', materialVersionId: 'version-1', revisionNo: 1, status: 'uncertain', ruleBundleVersion: '1.0.0', publicSnapshotId: null, summary: { headline: '识别到 TypeScript 与性能取舍信号', strongestSignals: ['TypeScript', '性能'], unknownKinds: ['outcome'], truthNotice: '仅基于用户材料的系统推断。' }, findings: [{ findingId: 'finding-1', kind: 'skill', label: 'TypeScript', factLayer: 'system-inference', confidence: 0.9, ruleRevision: 'rule-1', evidence: { snippet: '熟悉 TypeScript', startCodepoint: 5, endCodepoint: 20, relation: 'supports' } }], createdAt: '2026-08-27T10:02:00Z' })
    return json([])
  })
}

beforeEach(() => vi.stubGlobal('fetch', mockApi()))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function prepareValidDraft(body = '招聘要求：熟悉 TypeScript，并能解释测试与性能取舍。') {
  const sourceBody = screen.getByLabelText(sourceLabel)
  fireEvent.change(sourceBody, { target: { value: body } })
  fireEvent.click(screen.getByLabelText(/我确认有权将此内容用于个人研究/))
  return sourceBody
}

describe('信息源工作台真实纵切', () => {
  it('初始状态显示四步、真实字符上限、隐私边界和保存操作', async () => {
    render(<SourceWorkbenchPage />)
    expect(screen.getByRole('heading', { name: '把新材料带进职业研究' })).toBeInTheDocument()
    expect(screen.getByLabelText('信息源处理步骤')).toHaveTextContent('1粘贴内容2确认分类3查看摘要4对照研究后续任务')
    expect(screen.getByText('0 / 100,000')).toBeInTheDocument()
    expect(screen.getByText('先脱敏，再处理')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存并建议分类' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/尚无已保存记录/)).toBeInTheDocument())
  })

  it('空白、URL-only 与未确认权利都在前端阻断且不提交正文', () => {
    render(<SourceWorkbenchPage />)
    const sourceBody = screen.getByLabelText(sourceLabel)
    const submit = screen.getByRole('button', { name: '保存并建议分类' })
    fireEvent.change(sourceBody, { target: { value: '   \n　' } })
    fireEvent.click(submit)
    expect(screen.getByRole('alert')).toHaveTextContent('请先粘贴可处理的正文。')
    fireEvent.change(sourceBody, { target: { value: 'https://example.com/jobs?id=1' } })
    fireEvent.click(submit)
    expect(screen.getByRole('alert')).toHaveTextContent('当前不会自动访问或抓取网址')
    fireEvent.change(sourceBody, { target: { value: '一段可处理的技术文章正文。' } })
    fireEvent.click(submit)
    expect(screen.getByRole('alert')).toHaveTextContent('请先确认你有权将此内容用于个人研究。')
  })

  it('真实保存、分类确认和分析均经本地 API，并显示证据与事实分层', async () => {
    const { container } = render(<SourceWorkbenchPage />)
    prepareValidDraft('<script>alert("x")</script>招聘要求：熟悉 TypeScript，并能解释性能取舍。')
    fireEvent.click(screen.getByRole('button', { name: '保存并建议分类' }))
    expect(await screen.findByRole('heading', { name: '确认双轴分类' })).toHaveFocus()
    expect(screen.getByLabelText(/^来源渠道/)).toHaveValue('recruiting_platform')
    expect(screen.getByText(/置信度：91%/)).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '确认分类并分析' }))
    expect(await screen.findByRole('heading', { name: '结构化分析结果' })).toBeInTheDocument()
    expect(screen.getByText('TypeScript', { selector: 'h3' })).toBeInTheDocument()
    expect(screen.getByText('系统推断')).toBeInTheDocument()
    expect(screen.getByText('熟悉 TypeScript')).toBeInTheDocument()
    expect(screen.getByText(/公共研究快照未就绪/)).toBeInTheDocument()
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
    expect(urls).toEqual(expect.arrayContaining([expect.stringContaining('/api/v1/materials'), expect.stringContaining(':classify'), expect.stringContaining('/classification'), expect.stringContaining(':analyze')]))
    const saveCall = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith('/api/v1/materials'))
    expect(JSON.parse(String(saveCall?.[1]?.body))).toMatchObject({
      rightsConfirmation: {
        userHasRights: true,
        sensitiveDataAcknowledged: true,
        policyRevision: 'career-private-rights-1.0.0',
      },
    })
    expect(JSON.parse(String(saveCall?.[1]?.body))).not.toHaveProperty('tenantId')
    expect(JSON.parse(String(saveCall?.[1]?.body))).not.toHaveProperty('accountId')
  })

  it('服务失败显示诚实中文状态并保留用户正文', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/history') ? json([]) : Promise.reject(new Error('offline'))))
    render(<SourceWorkbenchPage />)
    const sourceBody = prepareValidDraft()
    fireEvent.click(screen.getByRole('button', { name: '保存并建议分类' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('无法连接本地职业分析服务')
    expect(sourceBody).toHaveValue('招聘要求：熟悉 TypeScript，并能解释测试与性能取舍。')
  })

  it('清空仍要求二次确认，取消保留、确认才清空', async () => {
    render(<SourceWorkbenchPage />)
    const sourceBody = prepareValidDraft()
    const clearButton = screen.getByRole('button', { name: '清空' })
    fireEvent.click(clearButton)
    await waitFor(() => expect(screen.getByRole('button', { name: '取消清空' })).toHaveFocus())
    fireEvent.click(screen.getByRole('button', { name: '取消清空' }))
    expect(sourceBody).not.toHaveValue('')
    fireEvent.click(clearButton)
    fireEvent.click(screen.getByRole('button', { name: '确认清空' }))
    expect(sourceBody).toHaveValue('')
  })
})
