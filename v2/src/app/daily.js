import '../styles/main.css'
import { mountShell, MODES } from '../lib/shell.js'
import { createDiaryPage } from '../pages/diary.js'

const nav = [
  { id: 'genel-bakis', label: 'Genel Bakış', short: 'Genel', iconName: 'grid' },
  { id: 'filmler', label: 'Film Önerileri', short: 'Film', iconName: 'film' },
  { id: 'gunluk-yasemin', label: "Yasemin'in Günlüğü", short: 'Günlük', iconName: 'book' },
  { id: 'gardirop', label: 'Akıllı Gardırop', short: 'Gardırop', iconName: 'shirt' },
  { id: 'alisveris', label: 'Alışveriş Takipçim', short: 'Alışveriş', iconName: 'cart' },
  { id: 'gunluk-kagan', label: "Kağan'ın Günlüğü", iconName: 'book' },
  { id: 'ayarlar', label: 'Ayarlar', iconName: 'settings' },
]

const routes = {
  'genel-bakis': { title: 'Genel Bakış', load: () => import('../pages/overview.js') },
  filmler: { title: 'Film Önerileri', load: () => import('../pages/films.js') },
  alisveris: { title: 'Alışveriş Takipçim', load: () => import('../pages/wishlist.js') },
  gardirop: { title: 'Akıllı Gardırop', load: () => import('../pages/wardrobe.js') },
  ayarlar: { title: 'Ayarlar', load: () => import('../pages/settings.js') },
  'gunluk-yasemin': { title: "Yasemin'in Günlüğü", load: async () => createDiaryPage('yasemin') },
  'gunluk-kagan': { title: "Kağan'ın Günlüğü", load: async () => createDiaryPage('kagan') },
}

mountShell({
  mode: MODES.daily,
  nav,
  user: { name: 'Yasemin', role: 'Süper Yönetici', initial: 'Y' },
  routes,
  defaultRoute: 'genel-bakis',
})
