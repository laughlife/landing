export type AdminContentFieldKind = 'text' | 'textarea' | 'richtext' | 'number' | 'select' | 'switch' | 'datetime' | 'string-list' | 'steps'

export interface AdminContentSelectOption {
  label: string
  value: string
}

export interface AdminContentFieldDefinition {
  key: string
  label: string
  kind?: AdminContentFieldKind
  required?: boolean
  placeholder?: string
  description?: string
  options?: readonly AdminContentSelectOption[]
  wide?: boolean
}

function defaultSelectValue(field: AdminContentFieldDefinition) {
  return field.options?.find(option => option.value !== '')?.value
}

export function buildFreshAdminContentForm(fields: readonly AdminContentFieldDefinition[], defaults: Record<string, unknown> = {}) {
  const next: Record<string, unknown> = { ...defaults }
  for (const field of fields) {
    if (next[field.key] !== undefined)
      continue
    next[field.key] = field.kind === 'switch'
      ? false
      : field.kind === 'number'
        ? 0
        : field.kind === 'string-list' || field.kind === 'steps'
          ? []
          : field.kind === 'select'
            ? defaultSelectValue(field)
            : ''
  }
  return next
}

export function cloneAdminContentFormValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(item => cloneAdminContentFormValue(item))
  if (value instanceof Date)
    return value.toISOString()
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null)
      return undefined
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneAdminContentFormValue(item)]))
  }
  return value
}

export function buildAdminContentFormFromRow(
  fields: readonly AdminContentFieldDefinition[],
  defaults: Record<string, unknown> = {},
  row: Record<string, unknown>
) {
  const next = buildFreshAdminContentForm(fields, defaults)
  for (const field of fields) {
    if (row[field.key] === undefined)
      continue
    const value = cloneAdminContentFormValue(row[field.key])
    if (value !== undefined)
      next[field.key] = value
  }
  return next
}
