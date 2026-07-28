import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { buildAdminContentFormFromRow, buildFreshAdminContentForm } from '../../app/utils/adminContentForm'

describe('admin content form helpers', () => {
  const fields = [
    { key: 'title', label: '标题', required: true },
    { key: 'sortOrder', label: '排序', kind: 'number' },
    { key: 'status', label: '状态', kind: 'select', options: [{ label: '空', value: '' }, { label: '已启用', value: 'ENABLED' }] },
    { key: 'isFeatured', label: '首页推荐', kind: 'switch' },
    { key: 'features', label: '特点', kind: 'string-list' },
    { key: 'processSteps', label: '流程', kind: 'steps' }
  ] as const

  it('builds default values from field definitions', () => {
    expect(buildFreshAdminContentForm(fields, { status: 'DISABLED' })).toEqual({
      title: '',
      sortOrder: 0,
      status: 'DISABLED',
      isFeatured: false,
      features: [],
      processSteps: []
    })
  })

  it('copies only editable plain data from row objects', () => {
    const row = {
      id: 1,
      title: '演示主题 Banner',
      sortOrder: 2,
      status: 'ENABLED',
      features: ['稳定供应'],
      processSteps: [{ title: '沟通需求', description: '确认规格' }],
      window: globalThis
    }

    expect(() => buildAdminContentFormFromRow(fields, {}, row)).not.toThrow()

    const form = buildAdminContentFormFromRow(fields, {}, row)
    expect(form).toEqual({
      title: '演示主题 Banner',
      sortOrder: 2,
      status: 'ENABLED',
      isFeatured: false,
      features: ['稳定供应'],
      processSteps: [{ title: '沟通需求', description: '确认规格' }]
    })
    expect(form).not.toHaveProperty('window')
    expect(form.features).not.toBe(row.features)
    expect(form.processSteps).not.toBe(row.processSteps)
  })

  it('accepts Vue reactive row proxies when opening an editor', () => {
    const row = reactive({
      id: 2,
      title: '让可靠供应，成为增长的底气',
      sortOrder: 1,
      status: 'ENABLED',
      features: ['现货供应'],
      processSteps: [{ title: '确认需求', description: '匹配产品方案' }]
    })

    expect(() => buildAdminContentFormFromRow(fields, {}, row)).not.toThrow()

    const form = buildAdminContentFormFromRow(fields, {}, row)
    expect(form.title).toBe('让可靠供应，成为增长的底气')
    expect(form.features).toEqual(['现货供应'])
    expect(form.processSteps).toEqual([{ title: '确认需求', description: '匹配产品方案' }])
    expect(form.features).not.toBe(row.features)
    expect(form.processSteps).not.toBe(row.processSteps)
  })
})
