// Parse JSON data only; never execute downloaded page scripts.
export function parsePageData(text) {
  const match = text.match(/window\.globalData\s*=\s*(\{[^\r\n]*\})\s*;?\s*<\/script>/)
  if (!match) throw new Error('活动页面缺少 globalData')
  const globalData = JSON.parse(match[1])
  const rawExtension = globalData.extension || globalData.pageInfo?.extension
  const extension = typeof rawExtension === 'string'
    ? JSON.parse(rawExtension)
    : rawExtension
  const configUrl = extension?.pageConfigJsonUrl || globalData.pageConfigJsonUrl
  const url = new URL(configUrl)
  if (url.protocol !== 'https:' || url.hostname !== 's3plus.meituan.net') {
    throw new Error('活动配置地址不受支持')
  }
  return { globalData, configUrl: url.href }
}

export function selectEnvelope(tree, renderList) {
  const matches = []
  function visit(nodes) {
    for (const node of nodes || []) {
      if (node.name === '@gdc/fx-netunion-red-envelope-multiple' &&
          renderList.includes(node.instanceID)) matches.push(node)
      visit(node.children)
    }
  }
  visit(tree)
  if (matches.length !== 1) {
    throw new Error(`常规红包可见组件数量异常: ${matches.length}`)
  }
  const node = matches[0]
  for (const key of ['priorityCouponIds', 'expandCouponIds']) {
    if (!Array.isArray(node.props?.[key]?.keys)) {
      throw new Error(`红包配置缺少 ${key}`)
    }
  }
  return { ...node.props, instanceID: node.instanceID }
}

export function couponResults(data) {
  const coupons = data?.allCoupons ?? data?.coupons
  if (!Array.isArray(coupons) || coupons.length === 0) {
    throw new Error('接口未返回优惠券，无法确认领取成功')
  }
  return coupons
}
