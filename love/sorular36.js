// 36 Soru — birbirinize yaklaştıran, gittikçe derinleşen sohbet kartları.
// Üç set: Isınma → Derinleşme → Kalpten. Kaldığınız kart Firestore'da
// (settings/qa36) tutulur; ikiniz de aynı yerden devam edersiniz.
import { db, doc, getDoc, setDoc } from '../firebase-config.js';
import { esc } from '../utils.js';
import { burst } from './shared.js';

const SETS = [
  {
    name: 'Isınma', emoji: '☀️',
    questions: [
      'Bir gün boyunca tarihin herhangi bir döneminde yaşayabilseydin hangisini seçerdin?',
      'Seni anında mutlu eden üç küçük şey ne?',
      'En son ne zaman kendi kendine şarkı söyledin? Hangi şarkıydı?',
      'Çocukken büyüyünce ne olmak istiyordun?',
      'Seni en çok güldüren anımız hangisi?',
      'Bir süper gücün olsaydı ne olurdu, onu ilk ne için kullanırdın?',
      'Kimsenin bilmediği tuhaf ama masum bir alışkanlığın var mı?',
      'Bu hafta seni gülümseten bir anı anlat.',
      'Ailenden aldığın ve sevdiğin bir özelliğin hangisi?',
      'Bir gün başka biri olarak yaşayabilsen kim olmak isterdin?',
      'Beni ilk gördüğünde aklından ne geçti?',
      'Birlikte gitmek istediğin ilk üç şehir hangileri?'
    ]
  },
  {
    name: 'Derinleşme', emoji: '🌊',
    questions: [
      'Hayaller listende en üstte ne var?',
      'Kendinle en çok gurur duyduğun küçük bir anı anlat.',
      'Bir insanda seni en çok etkileyen özellik ne?',
      'Çocukluğundan aklında kalan en sıcak koku ya da ses ne?',
      'En zor anında seni ne ayağa kaldırdı?',
      'Beş yıl sonra nerede yaşıyor, ne yapıyor olmak istersin?',
      'Sevgiyi en çok nasıl hissedersin: sözle, dokunuşla, birlikte vakitle, hediyeyle, yardımla?',
      'Ailende gördüğün ve ilişkimize taşımak istediğin bir şey var mı?',
      'Benim sende değiştirdiğim bir şey var mı?',
      'Seni en çok ne kırar? Kırıldığında benden ne duymak istersin?',
      'Hakkımda merak ettiğin ama hiç sormadığın bir şeyi şimdi sor.',
      'Hayatında "iyi ki" dediğin bir karar hangisi?'
    ]
  },
  {
    name: 'Kalpten', emoji: '💞',
    questions: [
      'İkimizi tek kelimeyle anlatsan hangi kelime olurdu? Neden?',
      'Bana söylemekten çekindiğin ama söylemek istediğin bir şey var mı?',
      'Benimle ilgili en sevdiğin üç küçük detay ne?',
      'Sence ilişkimizin en güzel anı hangisiydi?',
      '70 yaşında olduğumuzu hayal et: Bir günümüz nasıl geçiyor?',
      'Benden hiç beklemediğin ama seni çok mutlu eden bir şey neydi?',
      'Kendinle ilgili en çok neyin görülmesini istiyorsun?',
      'Son zamanlarda seni en çok duygulandıran şey neydi?',
      'Bana bir söz verecek olsan ne söz verirdin?',
      'Sence birbirimizden en çok ne öğreniyoruz?',
      'Gelecekte birlikte başlatmak istediğin bir gelenek ne olsun?',
      'Şimdi bir dakika boyunca sessizce sarılın. Sonra ilk aklına geleni söyle. 💞'
    ]
  }
];

const ALL = SETS.flatMap((s, si) => s.questions.map((q, qi) => ({ q, set: s, si, n: si * 12 + qi + 1 })));
const progressRef = () => doc(db, 'settings', 'qa36');

export async function initializeSorular36() {
  const root = document.getElementById('quiz-qa-view');
  // Sekmeye her geçişte çağrılır; aynı sayfada bir kez kurulsun.
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';

  const cardEl = root.querySelector('#qa-card');
  const fillEl = root.querySelector('#qa-fill');
  const countEl = root.querySelector('#qa-count');
  const setsEl = root.querySelector('#qa-sets');
  let index = 0;

  try {
    const snap = await getDoc(progressRef());
    if (snap.exists()) index = Math.min(ALL.length - 1, Math.max(0, snap.data().index || 0));
  } catch (err) {
    console.warn('36 soru ilerlemesi okunamadı:', err);
  }

  setsEl.innerHTML = SETS.map((s, i) =>
    `<button type="button" class="chip" data-set="${i}">${s.emoji} ${s.name}</button>`).join('');

  function render(direction = 0) {
    const item = ALL[index];
    cardEl.classList.remove('qa-in-next', 'qa-in-prev');
    void cardEl.offsetWidth;
    if (direction) cardEl.classList.add(direction > 0 ? 'qa-in-next' : 'qa-in-prev');
    cardEl.innerHTML = `
      <span class="qa-set">${item.set.emoji} ${item.set.name}</span>
      <span class="qa-num numeric">${item.n}</span>
      <p class="qa-question">${esc(item.q)}</p>
      <span class="qa-hint">Önce biri cevaplasın, sonra diğeri 💬</span>`;
    fillEl.style.width = `${Math.round((item.n / ALL.length) * 100)}%`;
    countEl.textContent = `${item.n} / ${ALL.length}`;
    setsEl.querySelectorAll('[data-set]').forEach(b => b.classList.toggle('is-active', Number(b.dataset.set) === item.si));
    root.querySelector('#qa-prev').disabled = index === 0;
    root.querySelector('#qa-next').innerHTML = index === ALL.length - 1
      ? '<ion-icon name="heart"></ion-icon> Bitirdik!'
      : 'Sonraki <ion-icon name="arrow-forward-outline"></ion-icon>';
  }

  function go(to) {
    const dir = Math.sign(to - index);
    index = Math.min(ALL.length - 1, Math.max(0, to));
    render(dir);
    setDoc(progressRef(), { index }, { merge: true }).catch(err => console.warn('İlerleme kaydedilemedi:', err));
  }

  root.querySelector('#qa-prev').addEventListener('click', () => go(index - 1));
  root.querySelector('#qa-next').addEventListener('click', () => {
    if (index === ALL.length - 1) { burst(['💞', '✨', '🥹', '💖'], 20); return; }
    go(index + 1);
  });
  root.querySelector('#qa-restart').addEventListener('click', () => {
    if (confirm('Baştan başlamak istediğine emin misin?')) go(0);
  });
  setsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (b) go(Number(b.dataset.set) * 12);
  });

  render();
}
