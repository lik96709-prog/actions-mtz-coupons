import { afterEach, expect, it, vi } from 'vitest'
import request from '../src/request.js'
import { getRenderList } from '../src/template.js'

afterEach(() => vi.restoreAllMocks())

it('preserves a valid empty visibility map without querying the old endpoint', async () => {
  const get = vi.spyOn(request, 'get')
  const list = await getRenderList(null, {
    renderInfo: { status: 0, componentRenderInfos: { hidden: { render: false } } }
  })
  expect(list).toEqual([])
  expect(get).not.toHaveBeenCalled()
})

it('reports missing API data without crashing or dumping credentials', async () => {
  vi.spyOn(request, 'get').mockResolvedValue({ code: 403, secret: 'must-not-log' })
  await expect(getRenderList(null, { pageId: 123 })).rejects.toThrow('code=403, pageId=123')
})

it('uses remote visibility when local visibility is unavailable', async () => {
  vi.spyOn(request, 'get').mockResolvedValue({ data: { shown: { render: true }, absent: null } })
  await expect(getRenderList(null, {})).resolves.toEqual(['shown'])
})
