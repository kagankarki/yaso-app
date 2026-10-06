// Gemini çağrıları için tek nokta: model adı ve anahtar burada tanımlı.
// YasoAI, günlük yorumları, film önerisi ve burç sayfası hepsi bunu kullanır;
// model değişince tek bu dosyayı güncellemek yeter.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Gemini 3.6 Flash (Temmuz 2026, kararlı) birincil model. "gemini-flash-latest"
// yalnızca 3.6 geçici olarak yanıt vermezse yedek olarak denenir.
// Not: 2.x modelleri kapatıldı; AQ. ile başlayan yeni anahtarlarla onlara
// istek atmak yanıltıcı bir 401 döndürüyor, o yüzden listede yoklar.
export const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'];

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

let authWarned = false;

/**
 * generateContent isteği atar ve modelin metin yanıtını döndürür.
 * Hiçbir model yanıt veremezse hata fırlatır; çağıran taraf kendi
 * yedek (offline) davranışına geçer.
 */
export async function generateGeminiText(body) {
  if (!GEMINI_API_KEY) throw new Error('VITE_GEMINI_API_KEY tanımlı değil');

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Anahtar URL yerine başlıkta: sunucu/proxy loglarına düşmez.
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        // 3.x modelleri "düşünce" parçaları da dönebiliyor; sadece cevabı al.
        const text = (data.candidates?.[0]?.content?.parts || [])
          .filter(p => !p.thought && typeof p.text === 'string')
          .map(p => p.text)
          .join('')
          .trim();
        if (text) return text;
        lastError = new Error(`${model}: boş yanıt (${data.candidates?.[0]?.finishReason || 'bilinmiyor'})`);
        continue;
      }

      const errJson = await response.json().catch(() => ({}));
      const reason = errJson.error?.details?.find(d => d.reason)?.reason || errJson.error?.status || '';
      lastError = new Error(`${model}: HTTP ${response.status} ${reason}`.trim());

      if ((response.status === 400 || response.status === 401 || response.status === 403) && !authWarned
          && /API_KEY|ACCESS_TOKEN|UNAUTHENTICATED|PERMISSION/i.test(`${reason} ${errJson.error?.message || ''}`)) {
        authWarned = true;
        console.error(
          `❌ Gemini anahtarı reddedildi (${response.status} ${reason}). ` +
          'aistudio.google.com/apikey adresinden yeni bir anahtar oluşturup .env içindeki ' +
          'VITE_GEMINI_API_KEY ile Vercel ortam değişkenine koyun.'
        );
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Gemini yanıt vermedi');
}
