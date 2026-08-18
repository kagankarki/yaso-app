import '../styles/main.css'
import { mountShell, MODES } from '../lib/shell.js'

const nav = [
  { id: 'gelen-kutusu', label: 'Gelen Kutusu', short: 'Kutu', iconName: 'mail' },
  { id: 'ayarlar', label: 'Ayarlar', iconName: 'settings' },
]

const routes = {
  'gelen-kutusu': { title: 'Gelen Kutusu', load: () => import('../pages/inbox.js') },
  ayarlar: { title: 'Ayarlar', load: () => import('../pages/settings.js') },
}

mountShell({
  mode: MODES.business,
  nav,
  user: { name: 'Yasemin', role: 'Mimar', initial: 'Y' },
  routes,
  defaultRoute: 'gelen-kutusu',
})
