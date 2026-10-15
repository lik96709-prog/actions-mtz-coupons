import { describe, expect, it } from 'vitest'
import { couponResults, parsePageData, selectEnvelope } from '../src/page-config.js'

describe('current activity configuration', () => {
  it('reads JSON configuration from the full page without evaluating scripts', () => {
    const configUrl = 'https://s3plus.meituan.net/activity/page-config.json'
    const data = { extension: JSON.stringify({ pageConfigJsonUrl: configUrl }) }
    expect(parsePageData(`<script>window.globalData = ${JSON.stringify(data)}</script>`).configUrl).toBe(configUrl)
    expect(() => parsePageData('<script>window.globalData = runCode()</script>')).toThrow()
  })

  it('rejects unexpected configuration hosts', () => {
    const data = { extension: { pageConfigJsonUrl: 'https://example.com/config.json' } }
    expect(() => parsePageData(`<script>window.globalData=${JSON.stringify(data)};</script>`)).toThrow()
  })

  it('selects only the visible regular envelope and rejects ambiguous rendering', () => {
    const node = (id) => ({
      name: '@gdc/fx-netunion-red-envelope-multiple', instanceID: id,
      props: { priorityCouponIds: { keys: [] }, expandCouponIds: { keys: [] } }
    })
    const tree = [{ children: [node('visible'), node('hidden')] }]
    expect(selectEnvelope(tree, ['visible']).instanceID).toBe('visible')
    expect(() => selectEnvelope(tree, [])).toThrow()
    expect(() => selectEnvelope(tree, ['visible', 'hidden'])).toThrow()
  })

  it('handles both response formats and never reports empty results as success', () => {
    const coupons = [{ couponName: 'test' }]
    expect(couponResults({ allCoupons: coupons })).toBe(coupons)
    expect(couponResults({ coupons })).toBe(coupons)
    expect(() => couponResults({ allCoupons: [] })).toThrow()
    expect(() => couponResults({})).toThrow()
  })
})
