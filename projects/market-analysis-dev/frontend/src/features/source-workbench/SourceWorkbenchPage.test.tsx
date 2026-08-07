import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SourceWorkbenchPage } from './SourceWorkbenchPage'

const sourceLabel = '粘贴文章、招聘／面试要求、简历、项目材料或其他正文'

afterEach(() => cleanup())

function prepareValidDraft(body = '招聘要求：熟悉 TypeScript，并能解释测试与性能取舍。') {
  const sourceBody = screen.getByLabelText(sourceLabel)
  fireEvent.change(sourceBody, { target: { value: body } })
  fireEvent.click(screen.getByLabelText(/我确认有权将此内容用于个人研究/))

  return sourceBody
}

describe('信息源工作台可见纵切', () => {
  it('初始状态显示四步、真实字符上限、隐私边界和必要操作', () => {
    render(<SourceWorkbenchPage />)

    expect(screen.getByRole('heading', { name: '把新材料带进职业研究' })).toBeInTheDocument()
    expect(screen.getByLabelText('信息源处理步骤')).toHaveTextContent(
      '1粘贴内容2确认分类3查看摘要后续任务4对照研究后续任务',
    )
    expect(screen.getByText('0 / 100,000')).toBeInTheDocument()
    expect(screen.getByText('先脱敏，再处理')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '分析并建议分类' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空' })).toBeDisabled()
  })

  it('空白与 URL-only 均显示中文字段错误并保留输入', () => {
    render(<SourceWorkbenchPage />)
    const sourceBody = screen.getByLabelText(sourceLabel)

    fireEvent.change(sourceBody, { target: { value: '   \n　' } })
    fireEvent.click(screen.getByRole('button', { name: '分析并建议分类' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请先粘贴可处理的正文。')
    expect(sourceBody).toHaveAttribute('aria-invalid', 'true')

    fireEvent.change(sourceBody, { target: { value: 'https://example.com/jobs?id=1' } })
    fireEvent.click(screen.getByRole('button', { name: '分析并建议分类' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      '当前不会自动访问或抓取网址，请同时粘贴正文。',
    )
    expect(sourceBody).toHaveValue('https://example.com/jobs?id=1')
  })

  it('有效正文但权利未确认时阻断并把焦点移到确认项', () => {
    render(<SourceWorkbenchPage />)
    const sourceBody = screen.getByLabelText(sourceLabel)
    const rights = screen.getByLabelText(/我确认有权将此内容用于个人研究/)

    fireEvent.change(sourceBody, { target: { value: '一段可处理的技术文章正文。' } })
    fireEvent.click(screen.getByRole('button', { name: '分析并建议分类' }))

    expect(screen.getByRole('alert')).toHaveTextContent('请先确认你有权将此内容用于个人研究。')
    expect(rights).toHaveFocus()
  })

  it('进入真实可操作的分类确认预览且不伪造分析结果', () => {
    const { container } = render(<SourceWorkbenchPage />)
    const htmlText = '<script>alert("x")</script><img src=x onerror=alert(2)>React 招聘正文'
    prepareValidDraft(htmlText)

    fireEvent.click(screen.getByRole('button', { name: '分析并建议分类' }))

    expect(screen.getByRole('heading', { name: '确认双轴分类' })).toHaveFocus()
    expect(screen.getByText('本地整合引擎尚未启用')).toBeInTheDocument()
    expect(screen.getByLabelText(/^来源渠道/)).toHaveValue('未知')
    expect(screen.getByLabelText(/^内容类型/)).toHaveValue('未知')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByText('分析完成')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^来源渠道/), {
      target: { value: '招聘平台／ATS' },
    })
    fireEvent.change(screen.getByLabelText(/^内容类型/), {
      target: { value: '招聘职位' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认本次分类' }))

    expect(screen.getByRole('heading', { name: '分类已在本次标签页确认' })).toBeInTheDocument()
    expect(screen.getByText(/来源渠道：招聘平台／ATS · 内容类型：招聘职位/)).toBeInTheDocument()
  })

  it('清空二次确认默认聚焦取消，取消保留内容，确认才清空', async () => {
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
    expect(screen.getByLabelText(/我确认有权将此内容用于个人研究/)).not.toBeChecked()
  })
})
