const DEFAULT_CALENDAR_URL = 'https://crazybatto.de/geburtstage.html';
const DAY = 86_400_000;

export function usesWebsiteCalendar(settings = {}) {
  return settings.websiteCalendarEnabled !== false;
}

export function websiteCalendarUrl(settings = {}) {
  const url = new URL(settings.websiteCalendarUrl || DEFAULT_CALENDAR_URL);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Der Geburtstagskalender benötigt eine HTTPS-Adresse ohne Zugangsdaten.');
  }
  url.hash = '';
  url.search = '';
  return url.href;
}

export function parseBirthday(value) {
  const match = /^(\d{2})\.(\d{2})\.$/.exec(String(value || ''));
  if (!match) return null;
  const day = Number(match[1]), month = Number(match[2]);
  const date = new Date(Date.UTC(2000, month - 1, day));
  return date.getUTCDate() === day && date.getUTCMonth() + 1 === month ? { day, month } : null;
}

export function berlinDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
}

function occurrence(birthday, year) {
  const leap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
  const day = birthday.month === 2 && birthday.day === 29 && !leap ? 28 : birthday.day;
  return Date.UTC(year, birthday.month - 1, day);
}

export function daysUntilBirthday(birthday, now = new Date()) {
  const current = berlinDate(now);
  const today = Date.UTC(current.year, current.month - 1, current.day);
  let next = occurrence(birthday, current.year);
  if (next < today) next = occurrence(birthday, current.year + 1);
  return Math.round((next - today) / DAY);
}

export async function fetchWebsiteCalendar(settings, fetchImpl = fetch) {
  const url = new URL('/api/birthdays/calendar', websiteCalendarUrl(settings));
  const response = await fetchImpl(url.href, {
    headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8_000), redirect: 'error'
  });
  if (!response.ok) throw new Error('Der Kalender ist gerade nicht erreichbar.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512_000) throw new Error('Die Kalenderantwort ist zu groß.');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { await reader.cancel().catch(() => {}); }
  const body = JSON.parse(text);
  if (!Array.isArray(body.entries)) throw new Error('Die Kalenderantwort ist ungültig.');
  return body.entries.filter(entry => {
    if (!entry || typeof entry.name !== 'string') return false;
    const date = `${String(entry.day).padStart(2, '0')}.${String(entry.month).padStart(2, '0')}.`;
    return parseBirthday(date) && Number.isInteger(entry.daysUntil) && entry.daysUntil >= 0 && entry.daysUntil <= 366;
  }).sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, 'de'));
}

const safeName = name => String(name).replace(/[\r\n\t]/g, ' ').replace(/@/g, '@\u200b').replace(/[\\`*_{}\[\]()<>~|]/g, '\\$&').slice(0, 70);

export function formatWebsiteCalendar(entries, settings) {
  const url = websiteCalendarUrl(settings);
  const lines = ['🎂 **Geburtstage in unserer Community**'];
  if (!entries.length) lines.push('Noch keine freigegebenen Geburtstage eingetragen.');
  for (const entry of entries.slice(0, 12)) {
    const date = `${String(entry.day).padStart(2, '0')}.${String(entry.month).padStart(2, '0')}.`;
    const when = entry.daysUntil === 0 ? 'heute 🎉' : entry.daysUntil === 1 ? 'morgen' : `in ${entry.daysUntil} Tagen`;
    lines.push(`**${date}** · ${safeName(entry.name)} · ${when}`);
  }
  if (entries.length > 12) lines.push(`Weitere ${entries.length - 12} Geburtstage findest du auf der Webseite.`);
  lines.push(`\nKalender und eigenen Geburtstag verwalten: ${url}`);
  return lines.join('\n');
}

// Only successful sends are marked. A missing channel or temporary Discord error is retried.
export async function sendLegacyBirthdays({ settings, state, client, saveState, now = new Date(), onError = () => {} }) {
  const date = berlinDate(now);
  if (!settings.enabled || usesWebsiteCalendar(settings) || date.hour < (settings.hour ?? 9)) return;
  for (const [key, value] of Object.entries(state)) {
    const match = /^birthday:(\d{17,20}):(\d{17,20})$/.exec(key);
    const birthday = parseBirthday(value);
    if (!match || !birthday || daysUntilBirthday(birthday, now) !== 0) continue;
    const [, guildId, userId] = match;
    const sentKey = `${key}:sent:${date.year}`;
    if (state[sentKey] || !settings.channelId) continue;
    try {
      const channel = await client.channels.fetch(settings.channelId);
      if (!channel?.isTextBased() || channel.guildId !== guildId || typeof channel.send !== 'function') continue;
      await channel.send({
        content: String(settings.message || 'Alles Gute zum Geburtstag, {user}! 🎂').replaceAll('{user}', `<@${userId}>`).slice(0, 2000),
        allowedMentions: { parse: [], users: [userId] }
      });
      state[sentKey] = true;
      saveState();
    } catch (error) { onError(error); }
  }
}
