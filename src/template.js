import request from './request.js'
import { parsePageData, selectEnvelope } from './page-config.js'

function extractAppJsUrl(text) {
  const regex = /https:\/\/[^"]*\/app[^"]*\.js/
  const match = text.match(regex)

  return match ? match[0] : null
}

async function getTemplateData(cookie, gundamId, guard) {
  if (gundamId === '2KAWnD') {
    const response = await request(
      `https://market.waimai.meituan.com/gd/single.html?el_biz=waimai&el_page=gundam.loader&gundam_id=${gundamId}`,
      { cookie, timeout: 20000 }
    )
    if (!response.ok) throw new Error(`活动页面请求失败: ${response.status}`)
    const { globalData, configUrl } = parsePageData(await response.text())
    const config = await request.get(configUrl)
    const renderList = await getRenderList(cookie, globalData, guard)
    return {
      gundamId,
      gdId: globalData.gdId,
      pageId: globalData.pageId,
      actName: globalData.pageInfo.title,
      envelope: selectEnvelope(config.renderTree, renderList)
    }
  }
  const text = await request(
    `https://market.waimai.meituan.com/api/template/get?env=current&el_biz=waimai&el_page=gundam.loader&gundam_id=${gundamId}`
  ).then((rep) => rep.text())
  const matchGlobal = text.match(/globalData: ({.+})/)
  const appJs = extractAppJsUrl(text)

  try {
    const globalData = JSON.parse(matchGlobal[1])
    const renderList = await getRenderList(cookie, globalData, guard)

    return {
      gundamId,
      gdId: globalData.gdId,
      actName: globalData.pageInfo.title,
      appJs: appJs,
      pageId: globalData.pageId,
      renderList: renderList
    }
  } catch (e) {
    throw new Error(`活动配置数据获取失败: gdId: ${gundamId}, ${e}`)
  }
}

function getLocalRenderList(renderInfo) {
  if (renderInfo?.status != 0 || !renderInfo?.componentRenderInfos) return null

  return filterRenderableKeys(renderInfo.componentRenderInfos)
}

function filterRenderableKeys(renderInfo) {
  return Object.entries(renderInfo)
    .filter(([, v]) => v?.render)
    .map(([k]) => k)
}

// 通过接口获取真实的渲染列表
async function getRenderList(
  cookie,
  { gundamViewId, gdId, pageId, renderInfo },
  guard
) {
  let data

  if (renderInfo) {
    const renderList = getLocalRenderList(renderInfo)

    if (renderList !== null) {
      return renderList
    }
  }

  try {
    const res = await request.get(
      'https://market.waimai.meituan.com/gd/zc/renderinfo',
      {
        params: {
          el_biz: 'waimai',
          el_page: 'gundam.loader',
          gundam_id: gundamViewId,
          gdId: gdId,
          pageId: pageId,
          tenant: 'gundam'
        },
        cookie,
        guard
      }
    )

    if (!res.data || typeof res.data !== 'object' || Array.isArray(res.data)) {
      throw new Error(`renderinfo 未返回组件列表: code=${res.code ?? 'unknown'}, pageId=${pageId}, status=${renderInfo?.status ?? 'missing'}`)
    }
    data = res.data
  } catch (e) {
    throw new Error('renderinfo 接口调用失败: ' + (e.message || e.code || 'unknown'))
  }

  return filterRenderableKeys(data)
}

function matchMoudleData(text, start, end) {
  const reg = new RegExp(`${start}.+?(?=${end})`)

  const res = text.match(reg)

  if (!res) return null

  const data = eval(`({moduleId:"${res[0]})`)

  return data
}

export { getTemplateData, getRenderList, matchMoudleData }
