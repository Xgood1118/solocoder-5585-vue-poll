import { ref, computed } from 'vue'
import type { VoteRecord } from '@/types'
import { generateRichFingerprint, fingerprintSimilarity, type RichFingerprint } from '@/utils/fingerprint'
import { useLocalStorage } from '@/composables/useLocalStorage'

const UA_BLACKLIST = [
  /bot|crawl|spider|scraper|crawler|slurp|bingpreview|duckduckbot|yandexbot|baiduspider|sogou|headless|puppeteer|playwright|selenium|phantom|webdriver|nightmare|casper|splash|wkhtml|httpclient|libwww|python-requests|aiohttp|scrapy|go-http-client|okhttp|wget|mechanize|faraday|nutch|heritrix|archive\.org_bot|facebookexternalhit|whatsapp|telegram|discord|line|slack|flipboard|tumblr|bufferapp|hootsuite|applebot|googlebot|bingbot|yeti|naverbot|exabot|mail\.ru_bot|seznambot|yandeximages|mj12bot|semrushbot|ahrefsbot|majestic12|dotbot|rogerbot|xenu|screaming|seo|monitor|uptime|statuscake|pingdom|site24x7|gtmetrix|webpagetest|loadimpact|k6|wrk|axios|node-fetch|restsharp|postman|insomnia|jmeter|loadrunner|newrelic|datadoghq|fastly|cloudflare|imperva|akamai|fastly|headlesschrome|headlessfirefox|electron|nw\.js/i,
  /python-|pycurl|urllib|requests\/|java\/|perl\s|php\/|ruby\/|asp\.net|\/curl|libcurl|grequests|eventlet|tornado|twisted|scrapyd|splash/i,
  /curl/i,
]

const UA_WHITELIST = [
  /chrome|firefox|safari|edge|opera|vivaldi|brave|mobi|mobile|android|iphone|ipad|samsungbrowser|ucbrowser|miuibrowser|huaweibrowser|qqbrowser|wechat|alipay|dingtalk|qq\/|crios|fxios|edgios|edga|edg/i,
]

const RISK = {
  UA_BLACKLIST: 100,
  UA_NO_WHITELIST: 25,
  EMPTY_UA: 80,
  WEBDRIVER_FLAG: 70,
  PLUGINS_MISSING: 30,
  LANGS_MISSING: 20,
  IP_FREQ_BURST: 60,
  POLL_FREQ_BURST: 50,
  FINGERPRINT_EXACT_DUP: 100,
  FINGERPRINT_SIMILAR: 45,
  SHORT_VISIT: 40,
  MULTI_VOTE_SHORT: 80,
  CIRCUMVENT_PATTERN: 90,
}

const IP_WINDOW_MS = 60_000
const IP_MAX_PER_WINDOW = 3
const IP_BURST_THRESHOLD = 8_000

const POLL_WINDOW_MS = 120_000
const POLL_MAX_PER_WINDOW = 2

const GLOBAL_WINDOW_MS = 300_000
const GLOBAL_MAX_PER_WINDOW = 8

const RISK_FUSE_THRESHOLD = 80
const SIMILARITY_THRESHOLD = 0.85

interface IPRecord {
  ip: string
  lastVotes: number[]
  blockedUntil: number
}

interface RiskEntry {
  timestamp: number
  points: number
  reason: string
}

export interface AntiFraudResult {
  allowed: boolean
  reason?: string
  riskScore: number
  riskReasons: string[]
  fuseTriggered: boolean
}

export function useAntiFraud() {
  const cachedFingerprint = ref<RichFingerprint | null>(null)
  const sessionStart = ref<number>(Date.now())
  const riskHistory = useLocalStorage<RiskEntry[]>('vue-poll-risk-history', [])
  const ipRecords = useLocalStorage<Record<string, IPRecord>>('vue-poll-ip-records', {})
  const recentVoteTimestamps = useLocalStorage<number[]>('vue-poll-recent-votes', [])
  const perPollTimestamps = useLocalStorage<Record<string, number[]>>('vue-poll-perpoll-timestamps', {})
  const fuseBlockedUntil = useLocalStorage<number>('vue-poll-fuse-blocked', 0)
  const fingerprintRegistry = useLocalStorage<Record<string, number>>('vue-poll-fp-registry', {})

  function getFingerprint(): RichFingerprint {
    if (!cachedFingerprint.value) {
      cachedFingerprint.value = generateRichFingerprint()
    }
    return cachedFingerprint.value
  }

  function currentRiskScore(): { score: number; reasons: string[] } {
    const now = Date.now()
    const cutoff = now - 10 * 60_000
    const active = riskHistory.value.filter(r => r.timestamp > cutoff)
    const score = active.reduce((acc, r) => acc + r.points, 0)
    return { score, reasons: active.map(r => r.reason) }
  }

  function addRisk(points: number, reason: string) {
    riskHistory.value.push({
      timestamp: Date.now(),
      points,
      reason,
    })
    if (riskHistory.value.length > 200) {
      riskHistory.value = riskHistory.value.slice(-200)
    }
    if (fuseBlockedUntil.value < Date.now() + 30_000) {
      fuseBlockedUntil.value = Math.max(fuseBlockedUntil.value, Date.now() + 30_000)
    }
  }

  function pruneOldRecords() {
    const now = Date.now()
    recentVoteTimestamps.value = recentVoteTimestamps.value.filter(t => now - t < GLOBAL_WINDOW_MS)
    for (const pollId of Object.keys(perPollTimestamps.value)) {
      perPollTimestamps.value[pollId] = perPollTimestamps.value[pollId].filter(t => now - t < POLL_WINDOW_MS)
    }
    for (const ip of Object.keys(ipRecords.value)) {
      const rec = ipRecords.value[ip]
      rec.lastVotes = rec.lastVotes.filter(t => now - t < IP_WINDOW_MS)
    }
  }

  function checkUserAgent(): number {
    const ua = (navigator.userAgent || '').trim()
    if (!ua) {
      addRisk(RISK.EMPTY_UA, '空User-Agent')
      return RISK.EMPTY_UA
    }
    for (const pattern of UA_BLACKLIST) {
      if (pattern.test(ua)) {
        addRisk(RISK.UA_BLACKLIST, 'UA匹配爬虫黑名单')
        return RISK.UA_BLACKLIST
      }
    }
    const inWhitelist = UA_WHITELIST.some(p => p.test(ua))
    if (!inWhitelist) {
      addRisk(RISK.UA_NO_WHITELIST, 'UA未在常见浏览器白名单中')
      return RISK.UA_NO_WHITELIST
    }
    return 0
  }

  function checkEnvironmentSignals(): number {
    const total = 0
    const nav = navigator as Navigator & { plugins?: PluginArray; languages?: string[] }
    if (nav.webdriver) {
      addRisk(RISK.WEBDRIVER_FLAG, 'navigator.webdriver=true (自动化特征)')
    }
    try {
      const pluginsLength = nav.plugins?.length ?? 0
      if (pluginsLength === 0 && !/Mobi|Android|iPhone|iPad/i.test(nav.userAgent || '')) {
        addRisk(RISK.PLUGINS_MISSING, '桌面端插件列表为空')
      }
    } catch { /* ignore */ }
    try {
      const langs = nav.languages ?? []
      if (langs.length === 0) {
        addRisk(RISK.LANGS_MISSING, '无语言设置')
      }
    } catch { /* ignore */ }
    return total
  }

  function checkFrequency(pollId: string): number {
    pruneOldRecords()
    const now = Date.now()
    let addedRisk = 0

    const globalCount = recentVoteTimestamps.value.length
    if (globalCount >= GLOBAL_MAX_PER_WINDOW) {
      addRisk(RISK.IP_FREQ_BURST, `全局频率超限:${globalCount}/${GLOBAL_MAX_PER_WINDOW}/5分钟`)
      addedRisk += RISK.IP_FREQ_BURST
    }

    const pollVotes = perPollTimestamps.value[pollId] ?? []
    if (pollVotes.length >= POLL_MAX_PER_WINDOW) {
      addRisk(RISK.POLL_FREQ_BURST, `单投票频率超限:${pollVotes.length}/${POLL_MAX_PER_WINDOW}/2分钟`)
      addedRisk += RISK.POLL_FREQ_BURST
    }

    if (recentVoteTimestamps.value.length >= 2) {
      const last = recentVoteTimestamps.value[recentVoteTimestamps.value.length - 1]
      const penult = recentVoteTimestamps.value[recentVoteTimestamps.value.length - 2]
      if (last - penult < IP_BURST_THRESHOLD && globalCount >= 3) {
        addRisk(RISK.MULTI_VOTE_SHORT, '多票间隔小于8秒疑似机械刷')
        addedRisk += RISK.MULTI_VOTE_SHORT
      }
    }

    const visitDuration = now - sessionStart.value
    if (visitDuration < 5_000) {
      addRisk(RISK.SHORT_VISIT, `停留时间过短:${Math.floor(visitDuration)}ms`)
      addedRisk += RISK.SHORT_VISIT
    }

    return addedRisk
  }

  function checkFingerprint(pollId: string, allVotes: VoteRecord[]): number {
    let addedRisk = 0
    const fp = getFingerprint()

    const exactMatch = allVotes.some(v => v.voterFingerprint === fp.combined)
    if (exactMatch) {
      addRisk(RISK.FINGERPRINT_EXACT_DUP, '指纹完全重复，已在该投票投过票')
      addedRisk += RISK.FINGERPRINT_EXACT_DUP
      return addedRisk
    }

    const existingFps = Object.keys(fingerprintRegistry.value)
    for (const existing of existingFps) {
      if (existing === fp.combined) continue
      const sim = fingerprintSimilarity(fp.combined, existing)
      if (sim >= SIMILARITY_THRESHOLD) {
        addRisk(
          RISK.FINGERPRINT_SIMILAR,
          `指纹高度相似(${Math.round(sim * 100)}%)：疑似换UA绕过`
        )
        addedRisk += RISK.FINGERPRINT_SIMILAR
        break
      }
    }

    fingerprintRegistry.value[fp.combined] = (fingerprintRegistry.value[fp.combined] ?? 0) + 1
    if (fingerprintRegistry.value[fp.combined] > 5) {
      addRisk(RISK.CIRCUMVENT_PATTERN, '同指纹多次提交不同会话')
      addedRisk += RISK.CIRCUMVENT_PATTERN
    }

    return addedRisk
  }

  function recordVote(pollId: string) {
    pruneOldRecords()
    const now = Date.now()
    recentVoteTimestamps.value.push(now)
    if (!perPollTimestamps.value[pollId]) perPollTimestamps.value[pollId] = []
    perPollTimestamps.value[pollId].push(now)
  }

  function evaluate(pollId: string, allVotes: VoteRecord[]): AntiFraudResult {
    pruneOldRecords()
    const now = Date.now()

    if (fuseBlockedUntil.value > now) {
      const remain = Math.ceil((fuseBlockedUntil.value - now) / 1000)
      return {
        allowed: false,
        reason: `风控临时熔断，剩余${remain}秒`,
        riskScore: 999,
        riskReasons: ['熔断中'],
        fuseTriggered: true,
      }
    }

    let totalRisk = 0
    totalRisk += checkUserAgent()
    totalRisk += checkEnvironmentSignals()
    totalRisk += checkFrequency(pollId)
    totalRisk += checkFingerprint(pollId, allVotes)

    const cumulative = currentRiskScore()
    const finalScore = totalRisk + cumulative.score

    const fuseTriggered = finalScore >= RISK_FUSE_THRESHOLD
    if (fuseTriggered) {
      fuseBlockedUntil.value = now + 5 * 60_000
      return {
        allowed: false,
        reason: '风控触发：检测到异常行为，请稍后再试或联系管理员',
        riskScore: finalScore,
        riskReasons: Array.from(new Set(cumulative.reasons)),
        fuseTriggered: true,
      }
    }

    const fp = getFingerprint()
    const exactDuplicate = allVotes.some(v => v.voterFingerprint === fp.combined)
    if (exactDuplicate) {
      return {
        allowed: false,
        reason: '您已参与过此投票',
        riskScore: finalScore,
        riskReasons: Array.from(new Set(cumulative.reasons)),
        fuseTriggered: false,
      }
    }

    return {
      allowed: totalRisk < RISK_FUSE_THRESHOLD && finalScore < RISK_FUSE_THRESHOLD,
      riskScore: finalScore,
      riskReasons: Array.from(new Set(cumulative.reasons)),
      fuseTriggered: false,
    }
  }

  const fuseRemainingSeconds = computed(() => {
    const remain = fuseBlockedUntil.value - Date.now()
    return remain > 0 ? Math.ceil(remain / 1000) : 0
  })

  return {
    evaluate,
    recordVote,
    addRisk,
    getFingerprint,
    currentRiskScore,
    fuseRemainingSeconds,
    fuseBlockedUntil,
  }
}
