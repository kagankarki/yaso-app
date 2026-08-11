import { db, collection, addDoc, serverTimestamp } from './firebase-config.js';

/**
 * Sessizce IP tabanlı konum verisini alıp Firebase Firestore 'address' koleksiyonuna kaydeder.
 * Kullanıcı tarafında hiçbir izin pop-up'ı (navigator.geolocation) çıkarmaz.
 */
export async function trackUserAddress() {
  try {
    let locationData = null;

    // 1. Birincil IP Geolocation Servisi (ipapi.co)
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          locationData = {
            ip: data.ip || 'Bilinmiyor',
            city: data.city || 'Bilinmiyor',
            region: data.region || 'Bilinmiyor',
            country: data.country_name || 'Bilinmiyor',
            countryCode: data.country_code || '',
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            org: data.org || data.asn || '',
            postal: data.postal || ''
          };
        }
      }
    } catch (e1) {
      // Birincil servis başarısız olursa yedek servise geç
    }

    // 2. İkincil / Yedek IP Geolocation Servisi (ipwho.is)
    if (!locationData) {
      try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success !== false) {
            locationData = {
              ip: data.ip || 'Bilinmiyor',
              city: data.city || 'Bilinmiyor',
              region: data.region || 'Bilinmiyor',
              country: data.country || 'Bilinmiyor',
              countryCode: data.country_code || '',
              latitude: data.latitude || null,
              longitude: data.longitude || null,
              org: data.connection?.isp || data.connection?.org || '',
              postal: data.postal || ''
            };
          }
        }
      } catch (e2) {
        // İkincil servis de başarısız
      }
    }

    // Servisler yanıt vermezse temel cihaz verileriyle devam et
    if (!locationData) {
      locationData = {
        ip: 'Alınamadı',
        city: 'Bilinmiyor',
        region: 'Bilinmiyor',
        country: 'Bilinmiyor',
        countryCode: '',
        latitude: null,
        longitude: null,
        org: '',
        postal: ''
      };
    }

    // 3. Cihaz şarj (Pil) bilgisini al (İzin pop-up'ı istemez)
    let batteryInfo = {
      batteryLevel: null, // Örn: 85 (%85)
      isCharging: null    // true / false (Şarjda mı?)
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        batteryInfo = {
          batteryLevel: Math.round(battery.level * 100),
          isCharging: battery.charging
        };

        // Kullanıcı şarjda değilse ve şarjı %20 veya altındaysa UI üzerinde şık bir uyarı kartı göster
        if (!battery.charging && batteryInfo.batteryLevel !== null && batteryInfo.batteryLevel <= 20) {
          showLowBatteryWarning(batteryInfo.batteryLevel);
        }

        // Cihaz kullanımı sırasında şarj değişirse dinle
        battery.addEventListener('levelchange', () => {
          const currentLevel = Math.round(battery.level * 100);
          if (!battery.charging && currentLevel <= 20) {
            showLowBatteryWarning(currentLevel);
          }
        });
      } catch (battErr) {
        // Battery API erişilemediğinde sessizce geç
      }
    }

    // Firebase Firestore 'address' koleksiyonuna yeni bir doküman kaydet
    await addDoc(collection(db, "address"), {
      ...locationData,
      ...batteryInfo,
      userAgent: navigator.userAgent || '',
      pageUrl: window.location.href,
      timestamp: serverTimestamp()
    });

  } catch (error) {
    // Hata durumunda kullanıcı arayüzü asla bozulmaz (sessiz yakalama)
    console.warn("Adres kaydı işlemi sırasında beklenmeyen durum:", error);
  }
}

/**
 * Kullanıcının şarjı %20 veya altına düştüğünde arayüzde şık bir uyarı toast mesajı gösterir.
 */
function showLowBatteryWarning(level) {
  if (document.getElementById('battery-warning-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'battery-warning-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: rgba(239, 68, 68, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #ffffff;
    padding: 14px 20px;
    border-radius: 18px;
    box-shadow: 0 12px 32px rgba(239, 68, 68, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 0.92rem;
    border: 1px solid rgba(255, 255, 255, 0.25);
    animation: slideUpBatteryToast 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  `;

  toast.innerHTML = `
    <div style="font-size: 1.6rem; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.2); width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;">
      🪫
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <strong style="font-size: 0.96rem; font-weight: 700; color: #ffffff;">Şarjın Azaldı (%${level}) ⚡</strong>
      <span style="font-size: 0.84rem; color: rgba(255, 255, 255, 0.92);">Telefonu şarja takmayı unutma! 🔌</span>
    </div>
    <button id="close-battery-toast" style="background: none; border: none; color: white; opacity: 0.85; font-size: 1.3rem; cursor: pointer; padding: 4px; margin-left: 8px; display: flex; align-items: center;">
      ✕
    </button>
  `;

  if (!document.getElementById('battery-toast-style')) {
    const style = document.createElement('style');
    style.id = 'battery-toast-style';
    style.textContent = `
      @keyframes slideUpBatteryToast {
        from { transform: translateY(80px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  const closeBtn = toast.querySelector('#close-battery-toast');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.style.animation = 'slideUpBatteryToast 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    });
  }

  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.animation = 'slideUpBatteryToast 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, 9000);
}
