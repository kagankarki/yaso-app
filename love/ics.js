// Telefon/bilgisayar takvimine eklenebilen .ics dosyası üretir.
// iPhone, Android (Google Takvim) ve Outlook açınca etkinliği hatırlatmasıyla
// birlikte ekler; böylece site kapalıyken de bildirim gelir.

const pad = n => String(n).padStart(2, '0');

// Saat dilimi vermeden "yerel" zaman: takvim telefonun saatine göre gösterir.
const localStamp = d =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const dateStamp = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const utcStamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const escapeText = s => String(s || '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

/**
 * @param {{uid:string,title:string,at:Date,allDay?:boolean,durationMin?:number,
 *          location?:string,description?:string,yearly?:boolean,alarmMin?:number}} ev
 */
export function buildIcs(ev) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartYasemin//Love//TR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.uid}@smartyasemin`,
    `DTSTAMP:${utcStamp(new Date())}`
  ];

  if (ev.allDay) {
    const next = new Date(ev.at.getFullYear(), ev.at.getMonth(), ev.at.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(ev.at)}`, `DTEND;VALUE=DATE:${dateStamp(next)}`);
  } else {
    const end = new Date(ev.at.getTime() + (ev.durationMin || 120) * 60000);
    lines.push(`DTSTART:${localStamp(ev.at)}`, `DTEND:${localStamp(end)}`);
  }

  if (ev.yearly) lines.push('RRULE:FREQ=YEARLY');
  lines.push(`SUMMARY:${escapeText(ev.title)}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);

  // Tüm gün etkinlikler için bir gün önce, saatli olanlar için 2 saat önce.
  const alarm = ev.alarmMin ?? (ev.allDay ? 24 * 60 : 120);
  lines.push(
    'BEGIN:VALARM',
    `TRIGGER:-PT${alarm}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(ev.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  );
  return lines.join('\r\n');
}

export function downloadIcs(ev) {
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(ev.title || 'etkinlik').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'etkinlik'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
