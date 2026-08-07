import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  CircleDashed,
  Code2,
  Info,
  Layers3,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

import styles from './DirectionsPage.module.css'

const direction = {
  name: '产品型前端／应用工程师',
  definition: '把前端技术与业务问题结合，独立承担一个业务功能从交互、数据流到质量验证的完整交付。',
  value: '围绕真实用户问题形成可用、可测、可协作的产品结果，而不是只完成页面实现。',
  levels: '初级至负责人',
  confidence: '角色推断 · 中高',
  conclusion: '当前样本覆盖较广；是否是更稳定的方向，仍需连续岗位量验证。',
} as const

const capabilitySignals = [
  { icon: Code2, title: '产品交付', text: '交互、状态、数据流与异常恢复' },
  { icon: ShieldCheck, title: '工程质量', text: '测试、性能、可访问性与安全边界' },
  { icon: UsersRound, title: '跨职能协作', text: '与产品、设计、后端共同对结果负责' },
] as const

export function DirectionsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="directions-title">
        <div>
          <p className={styles.eyebrow}>01 · 职业方向总览</p>
          <h1 id="directions-title">先看方向，再决定技术投入</h1>
          <p className={styles.intro}>
            当前先用一条获批研究方向验证阅读顺序和证据边界。方向是研究假设，不是岗位数量排名，也不会自动判断哪个方向最适合你。
          </p>
        </div>

        <aside className={styles.heroAside} aria-label="当前纵切范围">
          <span>首条可见纵切</span>
          <strong>1 / 8</strong>
          <p>本批仅展示一个方向；完整总览属于后续任务。</p>
        </aside>
      </section>

      <section className={styles.directionSection} aria-labelledby="direction-name">
        <div className={styles.directionMain}>
          <div className={styles.directionHeader}>
            <span className={styles.directionIcon} aria-hidden="true">
              <Blocks size={27} strokeWidth={1.9} />
            </span>
            <div>
              <p>宽基线方向 · 获批研究快照</p>
              <h2 id="direction-name">{direction.name}</h2>
            </div>
          </div>

          <p className={styles.directionDefinition}>{direction.definition}</p>

          <div className={styles.factLabels} aria-label="结论状态">
            <span>
              <CircleDashed size={15} strokeWidth={2} aria-hidden="true" />
              {direction.confidence}
            </span>
            <span>
              <UsersRound size={15} strokeWidth={2} aria-hidden="true" />
              适用层级：{direction.levels}
            </span>
          </div>

          <div className={styles.valuePanel}>
            <Info size={19} strokeWidth={1.9} aria-hidden="true" />
            <div>
              <strong>主要用户价值</strong>
              <p>{direction.value}</p>
            </div>
          </div>

          <div className={styles.capabilityList} aria-label="主要能力信号">
            {capabilitySignals.map((signal) => {
              const Icon = signal.icon
              return (
                <div key={signal.title}>
                  <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                  <span>
                    <strong>{signal.title}</strong>
                    <small>{signal.text}</small>
                  </span>
                </div>
              )
            })}
          </div>

          <button className={styles.nextButton} type="button" disabled aria-label="查看该方向的技术栈，后续任务">
            <Layers3 size={18} strokeWidth={2} aria-hidden="true" />
            查看该方向的技术栈
            <span>后续任务</span>
            <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <aside className={styles.evidencePanel} aria-label="研究边界与证据说明">
          <p className={styles.panelEyebrow}>证据说明</p>
          <h3>为什么先把它作为宽基线？</h3>
          <ul>
            <li>
              <CheckCircle2 size={17} strokeWidth={2} aria-hidden="true" />
              <span>核心目的样本普遍出现 API、质量、跨职能协作与端到端拥有。</span>
            </li>
            <li>
              <CheckCircle2 size={17} strokeWidth={2} aria-hidden="true" />
              <span>研究建议以产品型前端为宽基线，再选择一至两条纵向专长。</span>
            </li>
            <li>
              <CircleDashed size={17} strokeWidth={2} aria-hidden="true" />
              <span>{direction.conclusion}</span>
            </li>
          </ul>

          <dl>
            <div>
              <dt>结论类型</dt>
              <dd>角色推断</dd>
            </div>
            <div>
              <dt>置信度</dt>
              <dd>中高</dd>
            </div>
            <div>
              <dt>适用口径</dt>
              <dd>冻结目的样本</dd>
            </div>
            <div>
              <dt>主要限制</dt>
              <dd>中国与初级样本不足</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className={styles.scopeSection} aria-labelledby="scope-title">
        <div>
          <p className={styles.panelEyebrow}>阅读边界</p>
          <h2 id="scope-title">这不是职业匹配或个人诊断</h2>
        </div>
        <p>
          当前页面不提供薪资、需求量、增长率、个人分数或“最佳方向”结论。没有个人证据时，产品不会声称你已经掌握或欠缺任何能力。
        </p>
      </section>
    </div>
  )
}
