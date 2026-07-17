import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePermissionStore } from '@/stores/permission'

describe('permission store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has returns false for non-existent code', () => {
    const store = usePermissionStore()
    expect(store.has('fia:approve')).toBe(false)
  })

  it('has returns true after setCodes', () => {
    const store = usePermissionStore()
    store.setCodes(['fia:approve', 'spc:view'])
    expect(store.has('fia:approve')).toBe(true)
    expect(store.has('spc:view')).toBe(true)
    expect(store.has('ncm:entry')).toBe(false)
  })

  it('has returns true for wildcard', () => {
    const store = usePermissionStore()
    store.mockPermissions()
    expect(store.has('any:code')).toBe(true)
  })

  it('hasAny checks multiple codes', () => {
    const store = usePermissionStore()
    store.setCodes(['fia:approve'])
    expect(store.hasAny(['fia:approve', 'fia:reject'])).toBe(true)
    expect(store.hasAny(['spc:view', 'ncm:entry'])).toBe(false)
  })
})
