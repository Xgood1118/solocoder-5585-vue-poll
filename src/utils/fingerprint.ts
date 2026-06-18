export interface RichFingerprint {
  canvasHash: string
  screenHash: string
  fontHash: string
  navigatorHash: string
  webglHash: string
  audioHash: string
  combined: string
  riskSeed: number
}

function djb2Hash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

function murmur3Seed(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed
  for (let i = 0; i < str.length; i++) {
    let k1 = str.charCodeAt(i)
    k1 = Math.imul(k1, 0xcc9e2d51)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, 0x1b873593)
    h1 ^= k1
    h1 = (h1 << 13) | (h1 >>> 19)
    h1 = Math.imul(h1, 5) + 0xe6546b64
  }
  h1 ^= str.length
  h1 ^= h1 >>> 16
  h1 = Math.imul(h1, 0x85ebca6b)
  h1 ^= h1 >>> 13
  h1 = Math.imul(h1, 0xc2b2ae35)
  h1 ^= h1 >>> 16
  return h1 >>> 0
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

export function canvasOnlyHash(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 220
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'fallback-' + djb2Hash(navigator.userAgent || 'empty')

    ctx.textBaseline = 'top'
    ctx.font = 'bold 16px "Helvetica Neue", Arial, sans-serif'
    const grad = ctx.createLinearGradient(0, 0, 200, 0)
    grad.addColorStop(0, '#ff6600')
    grad.addColorStop(1, '#0099ff')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 220, 60)
    ctx.shadowColor = 'rgba(102, 204, 0, 0.7)'
    ctx.shadowBlur = 4
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Vue-Poll® 🔍 你好 🇨🇳', 8, 22)
    ctx.strokeStyle = 'rgba(255,0,255,0.5)'
    ctx.beginPath()
    ctx.moveTo(5, 45)
    for (let x = 0; x < 220; x += 13) {
      ctx.lineTo(x, 45 + Math.sin(x * 0.05) * 5)
    }
    ctx.stroke()

    return djb2Hash(canvas.toDataURL('image/png'))
  } catch {
    return 'canvas-fail-' + djb2Hash(navigator.userAgent || 'x')
  }
}

function screenSig(): string {
  return safe(() => {
    const s = window.screen
    return [
      s.width, s.height, s.colorDepth, s.pixelDepth,
      window.devicePixelRatio, window.innerWidth, window.innerHeight,
      window.outerWidth, window.outerHeight,
      s.availWidth, s.availHeight,
      window.screenLeft ?? window.screenX,
      window.screenTop ?? window.screenY,
      s.orientation?.type ?? 'unknown',
      s.orientation?.angle ?? 0,
    ].join('|')
  }, 'no-screen')
}

function collectFonts(): string[] {
  const baseFonts = ['Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria',
    'Comic Sans MS', 'Consolas', 'Courier', 'Courier New', 'Cursive',
    'Georgia', 'Helvetica', 'Helvetica Neue', 'Impact', 'Lucida Console',
    'Monaco', 'Palatino', 'Segoe UI', 'Tahoma', 'Times', 'Times New Roman',
    'Trebuchet MS', 'Verdana', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB',
    'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'Noto Sans CJK SC', 'Songti SC']
  const installed: string[] = []
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return installed
    for (const font of baseFonts) {
      const referenceWidth = (() => {
        ctx.font = '72px "MISSING_FONT_ZZZZZ"'
        return ctx.measureText('WMWM iIl1[]{}0OoQq').width
      })()
      ctx.font = `72px "${font}", "MISSING_FONT_ZZZZZ"`
      const testWidth = ctx.measureText('WMWM iIl1[]{}0OoQq').width
      if (Math.abs(testWidth - referenceWidth) > 0.1) {
        installed.push(font)
      }
    }
  } catch { /* ignore */ }
  return installed
}

function webglSig(): string {
  return safe(() => {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as (WebGLRenderingContext | null)
    if (!gl) return 'no-webgl'
    const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const vendor = dbgRenderInfo ? gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL) : 'unknown-vendor'
    const renderer = dbgRenderInfo ? gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) : 'unknown-renderer'
    const version = gl.getParameter(gl.VERSION)
    const shadingVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    const maxVarying = gl.getParameter(gl.MAX_VARYING_VECTORS)
    const maxViewport = JSON.stringify(gl.getParameter(gl.MAX_VIEWPORT_DIMS))
    return [vendor, renderer, version, shadingVersion, maxTexSize, maxVarying, maxViewport].join('|')
  }, 'webgl-fail')
}

function navigatorSig(): string {
  const n = navigator as Navigator & { [k: string]: unknown }
  return safe(() => {
    const conn = (n as unknown as { connection?: { effectiveType?: string; rtt?: number; downlink?: number } }).connection
    const hw = (n as unknown as { hardwareConcurrency?: number }).hardwareConcurrency ?? -1
    const mem = (n as unknown as { deviceMemory?: number }).deviceMemory ?? -1
    const kb = (n as unknown as { keyboard?: { getLayoutMap?: () => Promise<unknown> } } | undefined).keyboard
      ? 'kb' + (typeof (n as unknown as { keyboard: { getLayoutMap?: () => Promise<unknown> } }).keyboard?.getLayoutMap === 'function' ? '-map' : '-basic')
      : 'no-kb'
    const gp = 'getGamepads' in n ? 'gp' : 'no-gp'
    const bt = 'bluetooth' in n ? 'bt' : 'no-bt'
    const usb = 'usb' in n ? 'usb' : 'no-usb'
    const mc = 'mediaCapabilities' in n ? 'mc' : 'no-mc'
    const wb = n.webdriver ? 'webdriver' : 'human'
    const pd = n.platform
    const ace = n.appCodeName
    const appver = n.appVersion
    const lang = Array.isArray(n.languages) ? n.languages.join(',') : n.language ?? 'unknown'
    const cookie = n.cookieEnabled ? 'cookie' : 'no-cookie'
    const onl = n.onLine ? 'online' : 'offline'
    const dnt = (n as unknown as { doNotTrack?: string | null }).doNotTrack ?? 'unset'
    return [
      wb, pd, ace, appver, lang, cookie, onl, dnt,
      'hw=' + hw, 'mem=' + mem,
      conn ? ('et=' + conn.effectiveType + ';rtt=' + conn.rtt) : 'no-conn',
      kb, gp, bt, usb, mc,
      window.matchMedia?.('(pointer:coarse)').matches ? 'touch' : 'mouse',
      window.matchMedia?.('(hover:hover)').matches ? 'hover' : 'no-hover',
      window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'reduce-motion' : 'motion',
    ].join('|')
  }, 'nav-fail')
}

function audioSig(): string {
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    if (!Ctx) return 'no-audio-ctx'
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const analyser = ctx.createAnalyser()
    osc.type = 'sawtooth'
    osc.frequency.value = 342.1234
    gain.gain.value = 0.0001
    osc.connect(gain).connect(analyser)
    const buf = new Float32Array(1024)
    analyser.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += Math.abs(buf[i])
    const hash = murmur3Seed(sum.toFixed(6), 42).toString(16)
    try { ctx.close() } catch { /* ignore */ }
    return 'audio-' + hash
  } catch {
    return 'audio-fail'
  }
}

function touchSig(): string {
  const n = navigator as unknown as { maxTouchPoints?: number }
  return [
    'ontouchstart' in window ? 'touch' : 'no-touch',
    'maxTP=' + (n.maxTouchPoints ?? 0),
  ].join('|')
}

export function generateCanvasFingerprint(): string {
  return generateRichFingerprint().combined
}

export function generateRichFingerprint(): RichFingerprint {
  const canvasHash = canvasOnlyHash()
  const screenHash = djb2Hash(screenSig())
  const fontHash = djb2Hash(collectFonts().join(','))
  const navHash = djb2Hash(navigatorSig() + '|' + touchSig())
  const webglHash = djb2Hash(webglSig())
  const audioHash = djb2Hash(audioSig())
  const rawCombined = [canvasHash, screenHash, fontHash, navHash, webglHash, audioHash].join('|')
  const firstHash = djb2Hash(rawCombined)
  const secondHash = djb2Hash(firstHash + '_sec').slice(0, 6)
  const combined = firstHash + '-' + secondHash
  const riskSeed = murmur3Seed(firstHash + '_risk', 0x9e3779b9)
  return {
    canvasHash,
    screenHash,
    fontHash,
    navigatorHash: navHash,
    webglHash,
    audioHash,
    combined,
    riskSeed,
  }
}

export function fingerprintSimilarity(a: string, b: string): number {
  if (a === b) return 1.0
  const len = Math.max(a.length, b.length)
  if (len === 0) return 0
  let matches = 0
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) matches++
  }
  return matches / len
}
