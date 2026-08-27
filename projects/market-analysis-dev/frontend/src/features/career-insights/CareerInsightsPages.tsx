import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { careerApi, type AnalysisFinding, type MaterialHistory } from '../../api/career'
import styles from './CareerInsightsPages.module.css'

type PageKind = 'stacks' | 'evidence' | 'ai' | 'personal' | 'more'

const pageCopy = {
  stacks: { eyebrow: '02 · 技术栈全景', title: '从真实材料汇总技术栈', description: '只统计本地 SQLite 历史中已有证据的技能、工具和框架；不是预置清单。' },
  evidence: { eyebrow: '03 · 招聘证据', title: '查看材料中的招聘与要求证据', description: '证据来自你实际提交的招聘、面试或项目材料；用户材料不自动升级为市场事实。' },
  ai: { eyebrow: '04 · AI 增量', title: '识别前端工作的 AI 能力增量', description: '从真实分析结果中筛选 AI、模型、Agent、RAG 与自动化相关信号，并保留证据。' },
  personal: { eyebrow: '06 · 个人证据准备', title: '整理可回链的个人能力证据', description: '把职责、项目、成果和用户陈述与原文片段对应，推断与事实分开显示。' },
} as const

const factLayerCopy = {
  'externally-verifiable': '外部可核验事实',
  'user-stated': '用户陈述',
  'system-inference': '系统推断',
  UNKNOWN: '未知',
} as const

function latestFindings(history: readonly MaterialHistory[]) {
  return history.flatMap((item) => item.analyses.at(-1)?.findings ?? [])
}

function useHistory() {
  const [items, setItems] = useState<readonly MaterialHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    careerApi.history()
      .then((history) => { if (active) setItems(Array.isArray(history) ? history : []) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : '无法读取本地分析历史。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return { items, loading, error }
}

function filterFindings(page: Exclude<PageKind, 'more'>, findings: readonly AnalysisFinding[]) {
  if (page === 'stacks') return findings.filter((item) => ['skill', 'tool', 'framework'].includes(item.kind))
  if (page === 'evidence') return findings.filter((item) => item.evidence !== null)
  if (page === 'personal') return findings.filter((item) => ['responsibility', 'project', 'outcome'].includes(item.kind) || item.factLayer === 'user-stated')
  return findings.filter((item) => /\b(?:ai|llm|rag|agent|mcp|copilot)\b|模型|智能体|生成式|自动化/i.test(`${item.label} ${item.evidence?.snippet ?? ''}`))
}

function FindingCard({ finding }: { readonly finding: AnalysisFinding }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardMeta}><span>{finding.kind}</span><strong>{Math.round(finding.confidence * 100)}%</strong></div>
      <h2>{finding.label}</h2>
      <p className={styles.factLayer}>{factLayerCopy[finding.factLayer]}</p>
      <p>{finding.evidence?.snippet ?? '当前结论没有足够的原文证据，已按未知项保留。'}</p>
      <small>{finding.evidence ? `原文字符 ${finding.evidence.startCodepoint}–${finding.evidence.endCodepoint}` : '无证据偏移'} · 规则 {finding.ruleRevision}</small>
    </article>
  )
}

function MorePage() {
  const entries = [
    { to: '/evidence', title: '招聘证据', copy: '查看真实材料中的要求、证据片段与事实分层。' },
    { to: '/ai-increment', title: 'AI 增量', copy: '查看材料反映的 AI、模型与自动化能力。' },
    { to: '/personal-evidence', title: '个人证据准备', copy: '整理职责、项目和成果的可回链证据。' },
  ]
  return (
    <section className={styles.page}>
      <header><p>全部模块</p><h1>选择要查看的真实分析视图</h1><span>移动端“更多”只做导航汇总，不保存任何浏览器数据。</span></header>
      <div className={styles.linkGrid}>{entries.map((entry) => <Link key={entry.to} to={entry.to}><strong>{entry.title}</strong><span>{entry.copy}</span></Link>)}</div>
    </section>
  )
}

export default function CareerInsightsPages({ page }: { readonly page: PageKind }) {
  const { items, loading, error } = useHistory()
  const findings = useMemo(() => page === 'more' ? [] : filterFindings(page, latestFindings(items)), [items, page])

  if (page === 'more') return <MorePage />
  const copy = pageCopy[page]
  return (
    <section className={styles.page} aria-labelledby="insights-title">
      <header><p>{copy.eyebrow}</p><h1 id="insights-title">{copy.title}</h1><span>{copy.description}</span></header>
      <div className={styles.truth} role="status"><strong>本地真实分析</strong><span>{items.length} 份材料 · {findings.length} 条当前视图结果 · 数据来自 4318 /api/v1/history</span></div>
      {loading ? <div className={styles.state} role="status">正在读取本地 SQLite 历史…</div> : error ? <div className={styles.state} role="alert"><strong>读取失败</strong><p>{error}</p></div> : findings.length === 0 ? <div className={styles.state}><strong>当前没有符合条件的真实证据</strong><p>请先在信息源工作台提交相关材料并完成分类与分析。这里不会用 Demo 补空。</p><Link to="/source-workbench">前往信息源工作台</Link></div> : <div className={styles.grid}>{findings.map((finding) => <FindingCard key={finding.findingId} finding={finding} />)}</div>}
    </section>
  )
}
