import { db, collection, addDoc, serverTimestamp, PATHS } from '../lib/firebase.js'

/* ═══════════════════════════════════════════════════════════════
   ZİYARET KAYDI
   IP tabanlı konum + cihaz bilgisi Firestore'a yazılır.
   Eski sürümden farkı: Ayarlar'dan kapatılabilir ve kapalıyken
   hiçbir ağ isteği yapılmaz. Varsayılan: açık (eski davranış).
   ═══════════════════════════════════════════════════════════════ */

export const TRACKING_KEY = 'yaso_tracking_enabled'

export const isTrackingEnabled = () => localStorage.getItem(TRACKING_KEY) !== 'off'
export const setTracking = (on) => localStorage.setItem(TRACKING_KEY, on ? 'on' : 'off')

async function fromIpapi() {
  const res = await fetch('https://ipapi.co/json/')
  if (!res.ok) return null
  const d = await res.json()
  if (!d || d.error) return null
  return {
    ip: d.ip || 'Bilinmiyor',
    city: d.city || 'Bilinmiyor',
    region: d.region || 'Bilinmiyor',
    country: d.country_name || 'Bilinmiyor',
    countryCode: d.country_code || '',
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    org: d.org || d.asn || '',
    postal: d.postal || '',
  }
}

async function fromIpwho() {
  const res = await fetch('https://ipwho.is/')
  if (!res.ok) return null
  const d = await res.json()
  if (!d || d.success === false) return null
  return {
    ip: d.ip || 'Bilinmiyor',
    city: d.city || 'Bilinmiyor',
    region: d.region || 'Bilinmiyor',
    country: d.country || 'Bilinmiyor',
    countryCode: d.country_code || '',
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    org: d.connection?.isp || d.connection?.org || '',
    postal: d.postal || '',
  }
}

export async function trackVisit() {
  if (!isTrackingEnabled()) return

  let location = null
  for (const provider of [fromIpapi, fromIpwho]) {
    try {
      location = await provider()
      if (location) break
    } catch {
      /* bir sonraki sağlayıcıya geç */
    }
  }

  if (!location) {
    location = {
      ip: 'Alınamadı', city: 'Bilinmiyor', region: 'Bilinmiyor', country: 'Bilinmiyor',
      countryCode: '', latitude: null, longitude: null, org: '', postal: '',
    }
  }

  let battery = { batteryLevel: null, isCharging: null }
  if ('getBattery' in navigator) {
    try {
      const b = await navigator.getBattery()
      battery = { batteryLevel: Math.round(b.level * 100), isCharging: b.charging }
    } catch {
      /* Battery API yok */
    }
  }

  try {
    await addDoc(collection(db, PATHS.address), {
      ...location,
      ...battery,
      userAgent: navigator.userAgent || '',
      pageUrl: location.href || window.location.href,
      timestamp: serverTimestamp(),
    })
  } catch (err) {
    console.warn('[tracker]', err?.message)
  }
}
