import fs from 'node:fs'
import path from 'node:path'
import { HOME } from './tools/lib/paths.mjs'
import { apiGet, signWbi } from './tools/lib/bili-api.mjs'
import { guardedFetch as fetch } from './tools/lib/traffic.mjs'
import { exactJson } from './tools/lib/json-exact.mjs'
import { normalizeMessage } from './tools/lib/dm-history.mjs'

const owner = process.argv[2]
const cred = JSON.parse(fs.readFileSync(path.join(HOME, '.bili-ai/credentials.json'), 'utf8'))
const headers = { 'user-agent': 'Mozilla/5.0', referer: 'https://www.bilibili.com/', cookie: 'SESSDATA=' + cred.sessdata + '; bili_jct=' + cred.bili_jct + '; buvid3=' + cred.buvid3 }
const nav = await apiGet('https://api.bilibili.com/x/web-interface/nav', headers)
if (nav.code !== 0) { console.log('nav failed', nav.code, nav.message); process.exit(1) }
const self = String(nav.data.mid)
const query = signWbi({ talker_id: owner, session_type: 1, size: 30, begin_seqno: '0' }, nav.data.wbi_img)
const res = await fetch('https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs?' + query, { headers })
const body = await exactJson(res)
console.log('self=' + self + ' code=' + body.code + ' rows=' + (body.data?.messages?.length ?? 0))
const rows = body.data.messages.map(normalizeMessage).sort((a, b) => a.ts - b.ts)
for (const r of rows) {
  const dir = r.sender === owner ? 'OWNER->ME' : 'ME->OWNER'
  const t = new Date(r.ts * 1000).toISOString().replace('T', ' ').slice(0, 19)
  console.log(t, 'UTC', dir, 'type=' + r.type, JSON.stringify(String(r.text).slice(0, 90)))
}
