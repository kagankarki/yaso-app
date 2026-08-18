import '../styles/main.css'
import { mountShell, MODES } from '../lib/shell.js'

const nav = [
  { id: 'kosemiz', label: 'Bizim Köşemiz', short: 'Köşemiz', iconName: 'heart' },
  { id: 'zaman-tuneli', label: 'Zaman Tüneli', short: 'Tünel', iconName: 'route' },
]

const routes = {
  kosemiz: { title: 'Bizim Köşemiz', load: () => import('../pages/love-corner.js') },
  'zaman-tuneli': { title: 'Zaman Tüneli', load: () => import('../pages/timeline.js') },
}

mountShell({
  mode: MODES.love,
  nav,
  user: { name: 'Yasemin', role: "Kağan'ın biriciği", initial: 'Y' },
  routes,
  defaultRoute: 'kosemiz',
})
