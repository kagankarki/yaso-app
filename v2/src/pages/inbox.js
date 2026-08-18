import { icon } from '../lib/icons.js'
import { $, $$, esc, toast } from '../lib/ui.js'

/* Gelen kutusu şu an arayüz demosu — gerçek posta bağlantısı OAuth
   gerektirir. Eski sürümdeki içerik ve akış korundu, sinema diline
   çevrildi (her mail bir "senaryo taslağı" gibi listeleniyor). */

const MAILS = [
  {
    id: 'm1',
    from: 'Ahmet Yılmaz',
    email: 'ahmet@sirket.com',
    initial: 'A',
    time: '10:24',
    subject: 'Proje toplantısı hakkında',
    snippet: 'Merhaba Yasemin, yarınki toplantı için sunumu hazırlayabilir misin?',
    body: `Merhaba Yasemin,

Yarınki toplantı için vaziyet planının son revizyonunu ve cephe görsellerini sunuma ekleyebilir misin? Müşteri özellikle giriş holünün aydınlatmasını merak ediyor.

Toplantı 14:00'te, şantiye ofisinde.

İyi çalışmalar,
Ahmet`,
    unread: true,
  },
  {
    id: 'm2',
    from: 'Google Security',
    email: 'no-reply@google.com',
    initial: 'G',
    time: 'Dün',
    subject: 'Yeni cihazdan giriş yapıldı',
    snippet: 'Hesabınıza yeni bir Windows cihazından giriş yapıldı.',
    body: `Hesabınıza yeni bir Windows cihazından giriş yapıldı.

Konum: Ankara, Türkiye
Zaman: Dün 21:14

Bu siz değilseniz şifrenizi hemen değiştirin.`,
    unread: false,
  },
]

export function render() {
  return `
  <section class="card overflow-hidden pt-7">
    <div class="marquee" aria-hidden="true"></div>
    <div class="p-6 md:p-8">
      <p class="now-showing mb-3">Yapım ofisi</p>
      <h2 class="text-[1.5rem] md:text-[2.1rem] mb-3">Gelen kutusu</h2>
      <p class="text-muted text-[.94rem] max-w-[58ch] mb-5">
        Hesabını bağlayarak e-postalarını buradan yönetebilirsin. Bağlantı OAuth 2.0 ile kurulur;
        şifren hiçbir zaman saklanmaz.
      </p>
      <button class="btn btn-primary" id="connect-mail">${icon('shield')}Güvenli olarak bağlan</button>
    </div>
  </section>

  <section class="card grid grid-cols-1 lg:grid-cols-[340px_1fr] overflow-hidden" style="min-height:520px">
    <div class="border-b lg:border-b-0 lg:border-r border-line flex flex-col">
      <header class="flex items-center gap-3 p-4 border-b border-line">
        <h3 class="text-[1rem]">Kutu</h3>
        <button class="btn btn-icon btn-quiet btn-sm ml-auto" id="refresh" aria-label="Yenile">${icon('refresh', 'ico-sm')}</button>
      </header>
      <ul class="flex-1 overflow-y-auto list-none m-0 p-0" id="mail-list">
        ${MAILS.map(
          (m, i) => `
          <li>
            <button class="w-full text-left flex gap-3 p-4 border-b border-line transition hover:bg-surface-2 ${i === 0 ? 'bg-surface-2' : ''}"
                    data-mail="${esc(m.id)}" ${i === 0 ? 'aria-current="true"' : ''}>
              <span class="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-primary-soft text-primary font-bold">
                ${esc(m.initial)}
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span class="font-semibold text-[.92rem] truncate ${m.unread ? '' : 'text-muted'}">${esc(m.from)}</span>
                  <span class="label ml-auto shrink-0" style="font-size:.58rem">${esc(m.time)}</span>
                </span>
                <span class="block text-[.88rem] truncate mt-0.5">${esc(m.subject)}</span>
                <span class="block text-[.82rem] text-muted truncate mt-0.5">${esc(m.snippet)}</span>
              </span>
              ${m.unread ? '<span class="w-2 h-2 rounded-full shrink-0 mt-2" style="background:var(--primary)"></span>' : ''}
            </button>
          </li>`
        ).join('')}
      </ul>
    </div>

    <div class="flex flex-col" id="mail-view"></div>
  </section>`
}

function viewHtml(m) {
  return `
    <header class="flex items-start gap-3 p-5 border-b border-line">
      <span class="grid place-items-center w-11 h-11 shrink-0 rounded-full bg-primary-soft text-primary font-bold">
        ${esc(m.initial)}
      </span>
      <div class="min-w-0">
        <h3 class="text-[1.1rem]">${esc(m.subject)}</h3>
        <p class="text-[.84rem] text-muted mt-1">${esc(m.from)} &lt;${esc(m.email)}&gt;</p>
      </div>
      <div class="ml-auto flex gap-2">
        <button class="btn btn-icon btn-quiet btn-sm" aria-label="Yanıtla">${icon('reply', 'ico-sm')}</button>
        <button class="btn btn-icon btn-danger btn-sm" aria-label="Sil">${icon('trash', 'ico-sm')}</button>
      </div>
    </header>
    <div class="p-6 flex-1 overflow-y-auto">
      <p class="prose-diary" style="color:var(--text)">${esc(m.body)}</p>
    </div>
    <footer class="p-5 border-t border-line flex gap-2">
      <button class="btn btn-primary btn-sm">${icon('reply', 'ico-sm')}Yanıtla</button>
      <button class="btn btn-quiet btn-sm">${icon('external', 'ico-sm')}İlet</button>
    </footer>`
}

export function mount(root) {
  const view = $('#mail-view', root)
  view.innerHTML = viewHtml(MAILS[0])

  $$('[data-mail]', root).forEach((btn) =>
    btn.addEventListener('click', () => {
      $$('[data-mail]', root).forEach((b) => {
        b.classList.toggle('bg-surface-2', b === btn)
        if (b === btn) b.setAttribute('aria-current', 'true')
        else b.removeAttribute('aria-current')
      })
      const mail = MAILS.find((m) => m.id === btn.dataset.mail)
      if (mail) view.innerHTML = viewHtml(mail)
    })
  )

  $('#connect-mail', root).addEventListener('click', () =>
    toast('Posta bağlantısı için OAuth kurulumu gerekiyor — henüz bağlı değil.', '🔐', 6000)
  )
  $('#refresh', root).addEventListener('click', () => toast('Kutu güncel.', '📬'))

  return () => {}
}
