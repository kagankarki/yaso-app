import { icon } from '../lib/icons.js'
import { $, esc, toast } from '../lib/ui.js'
import { db, doc, setDoc, PATHS, DIARY_OWNERS } from '../lib/firebase.js'
import { isTrackingEnabled, setTracking } from '../features/tracker.js'
import { hasGemini } from '../lib/gemini.js'

export function render() {
  const tracking = isTrackingEnabled()
  return `
  <section class="card overflow-hidden pt-7">
    <div class="marquee" aria-hidden="true"></div>
    <div class="p-6 md:p-8">
      <p class="now-showing mb-3">Projeksiyon odası</p>
      <h2 class="text-[1.5rem] md:text-[2.1rem]">Ayarlar</h2>
    </div>
  </section>

  <section class="card p-6 md:p-8">
    <header class="flex items-center gap-2.5 mb-5">
      <span style="color:var(--primary)">${icon('key')}</span>
      <h3 class="text-[1.1rem]">Günlük şifreleri</h3>
    </header>
    <div class="grid md:grid-cols-2 gap-5">
      ${Object.entries(DIARY_OWNERS)
        .map(
          ([who, meta]) => `
        <div class="card-inset p-5 flex flex-col gap-3">
          <p class="label">${esc(meta.label)}</p>
          <input class="input" type="password" autocomplete="new-password"
                 id="pass-${who}" placeholder="Yeni şifre" />
          <button class="btn btn-primary btn-sm" data-save-pass="${who}">${icon('check', 'ico-sm')}Güncelle</button>
          <p class="text-[.84rem]" id="status-${who}"></p>
        </div>`
        )
        .join('')}
    </div>
    <p class="label mt-5 leading-relaxed">
      Bu kilit meraklı gözler içindir; tarayıcıda çalışır ve gerçek bir güvenlik katmanı değildir.
    </p>
  </section>

  <section class="card p-6 md:p-8">
    <header class="flex items-center gap-2.5 mb-5">
      <span style="color:var(--primary)">${icon('shield')}</span>
      <h3 class="text-[1.1rem]">Gizlilik</h3>
    </header>
    <label class="card-inset p-5 flex items-start gap-4 cursor-pointer">
      <input type="checkbox" id="tracking" class="mt-1 w-5 h-5 shrink-0 accent-[var(--primary)]" ${tracking ? 'checked' : ''} />
      <span>
        <span class="block font-semibold text-[.96rem] mb-1">Ziyaret kaydı</span>
        <span class="block text-[.88rem] text-muted leading-relaxed">
          Açıkken her açılışta IP tabanlı şehir bilgisi, cihaz ve şarj durumu Firestore'a kaydedilir.
          Kapalıyken hiçbir istek yapılmaz.
        </span>
      </span>
    </label>
  </section>

  <section class="card p-6 md:p-8">
    <header class="flex items-center gap-2.5 mb-5">
      <span style="color:var(--primary)">${icon('info')}</span>
      <h3 class="text-[1.1rem]">Sistem durumu</h3>
    </header>
    <dl class="grid sm:grid-cols-2 gap-3 m-0">
      ${[
        ['Tasarım', 'Gece Sineması v2'],
        ['Yapay zekâ', hasGemini ? 'Bağlı' : 'Anahtar tanımlı değil'],
        ['Tema', 'Karanlık / Gündüz seansı'],
        ['Modlar', 'Daily · Love · Business'],
      ]
        .map(
          ([k, v]) => `
        <div class="card-inset p-4">
          <dt class="label mb-1">${esc(k)}</dt>
          <dd class="m-0 text-[.94rem]">${esc(v)}</dd>
        </div>`
        )
        .join('')}
    </dl>
  </section>`
}

export function mount(root) {
  root.querySelectorAll('[data-save-pass]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const who = btn.dataset.savePass
      const meta = DIARY_OWNERS[who]
      const input = $(`#pass-${who}`, root)
      const status = $(`#status-${who}`, root)
      const next = input.value.trim()

      if (!next) { status.style.color = 'var(--danger)'; status.textContent = 'Lütfen yeni şifreyi gir.'; return }

      btn.disabled = true
      localStorage.setItem(`diary_password_${meta.key}`, next)

      try {
        await Promise.all([
          setDoc(doc(db, ...PATHS.diaryPassword(meta.key)), { value: next }),
          setDoc(doc(db, PATHS.settings, `diaryPassword_${meta.key}`), { value: next }),
        ])
        status.style.color = 'var(--ok)'
        status.textContent = 'Şifre güncellendi ✓'
      } catch {
        status.style.color = 'var(--warn)'
        status.textContent = 'Yerelde güncellendi (buluta yazılamadı).'
      }
      input.value = ''
      btn.disabled = false
      setTimeout(() => { status.textContent = '' }, 3200)
    })
  )

  $('#tracking', root).addEventListener('change', (e) => {
    setTracking(e.target.checked)
    toast(e.target.checked ? 'Ziyaret kaydı açıldı.' : 'Ziyaret kaydı kapatıldı.', '🔒')
  })

  return () => {}
}
