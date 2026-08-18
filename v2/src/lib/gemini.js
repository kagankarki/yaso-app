/* ═══════════════════════════════════════════════════════════════
   GEMINI İSTEMCİSİ
   İki mod:
   1) VITE_GEMINI_PROXY tanımlıysa → istekler kendi sunucunuza gider,
      anahtar tarayıcıya hiç inmez. ÖNERİLEN.
   2) Tanımlı değilse → doğrudan Google'a gider ve VITE_GEMINI_API_KEY
      kullanılır. Bu anahtar derlenmiş dosyada görünür olur; sadece
      yerel geliştirme için kullanın.
   ═══════════════════════════════════════════════════════════════ */

const PROXY = import.meta.env.VITE_GEMINI_PROXY || ''
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']

export const hasGemini = Boolean(PROXY || API_KEY)

async function callModel(model, body) {
  const url = PROXY
    ? `${PROXY.replace(/\/$/, '')}/${model}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const headers = { 'Content-Type': 'application/json' }
  if (!PROXY) headers['X-goog-api-key'] = API_KEY

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`${model} → ${res.status} ${detail.slice(0, 160)}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error(`${model} → boş yanıt`)
  return text.trim()
}

/**
 * Modelleri sırayla dener; hepsi başarısız olursa hata fırlatır.
 * @param {{prompt?:string, system?:string, imageBase64?:string, history?:Array, temperature?:number, maxTokens?:number}} opts
 */
export async function generate({
  prompt = '',
  system = '',
  imageBase64 = null,
  history = [],
  temperature = 0.7,
  maxTokens = 700,
} = {}) {
  const parts = []
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } })
  }
  parts.push({ text: prompt || 'Bunu yorumlar mısın?' })

  const contents = [...history, { role: 'user', parts }]
  const body = { contents, generationConfig: { temperature, maxOutputTokens: maxTokens } }
  if (system) body.system_instruction = { parts: [{ text: system }] }

  let lastError = null
  for (const model of MODELS) {
    try {
      return await callModel(model, body)
    } catch (err) {
      lastError = err
      console.warn('[gemini]', err.message)
    }
  }
  throw lastError || new Error('Gemini yanıt vermedi')
}
