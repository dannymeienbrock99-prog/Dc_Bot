import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBirthday, usesWebsiteCalendar, websiteCalendarUrl, fetchWebsiteCalendar, formatWebsiteCalendar, berlinDate, daysUntilBirthday, sendLegacyBirthdays } from '../src/birthdays.js';
import { upsertCommands } from '../src/register-commands.js';

test('valid calendar dates include leap day and reject impossible dates', () => {
  assert.deepEqual(parseBirthday('29.02.'), { day: 29, month: 2 });
  for (const date of ['31.04.', '30.02.', '00.12.', '12.00.', '99.99.', '1.01.', null]) assert.equal(parseBirthday(date), null);
});

test('shared mode defaults on, URL drops queries and rejects credentials/HTTP', () => {
  assert.equal(usesWebsiteCalendar(), true);
  assert.equal(usesWebsiteCalendar({ websiteCalendarEnabled: false }), false);
  assert.equal(websiteCalendarUrl(), 'https://crazybatto.de/geburtstage.html');
  assert.equal(websiteCalendarUrl({ websiteCalendarUrl: 'https://crazybatto.de/geburtstage.html?a=1#test' }), 'https://crazybatto.de/geburtstage.html');
  assert.throws(() => websiteCalendarUrl({ websiteCalendarUrl: 'http://crazybatto.de/' }));
  assert.throws(() => websiteCalendarUrl({ websiteCalendarUrl: 'https://user:pass@crazybatto.de/' }));
});

test('website feed uses fixed same-origin route, no secrets, sorted valid records', async () => {
  let called;
  const entries = await fetchWebsiteCalendar({}, async (url, options) => {
    called = { url, options };
    return Response.json({ entries: [
      { name: 'Later', day: 20, month: 12, daysUntil: 41 },
      { name: '@everyone **Today**', day: 9, month: 11, daysUntil: 0 },
      { name: 'Invalid', day: 31, month: 2, daysUntil: 3 },
      { name: 'Invalid', day: 3, month: 2, daysUntil: -1 }
    ] });
  });
  assert.equal(called.url, 'https://crazybatto.de/api/birthdays/calendar');
  assert.deepEqual(called.options.headers, { accept: 'application/json' });
  assert.equal(called.options.redirect, 'error');
  assert.equal(entries.length, 2);
  const message = formatWebsiteCalendar(entries, {});
  assert.match(message, /heute/);
  assert.doesNotMatch(message, /@everyone/);
  assert.match(message, /geburtstage\.html/);
});

test('website errors and oversized feed are rejected', async () => {
  await assert.rejects(fetchWebsiteCalendar({}, async () => new Response('down', { status: 503 })));
  await assert.rejects(fetchWebsiteCalendar({}, async () => Response.json({ entries: 'bad' })));
  await assert.rejects(fetchWebsiteCalendar({}, async () => new Response('x'.repeat(512001))));
});

test('calendar uses Berlin date over UTC, leap fallback and year rollover', () => {
  assert.equal(berlinDate(new Date('2026-12-31T23:30:00Z')).year, 2027);
  assert.equal(daysUntilBirthday({ day: 1, month: 1 }, new Date('2026-12-31T23:30:00Z')), 0);
  assert.equal(daysUntilBirthday({ day: 29, month: 2 }, new Date('2027-02-28T08:00:00Z')), 0);
  assert.equal(daysUntilBirthday({ day: 29, month: 2 }, new Date('2028-02-28T08:00:00Z')), 1);
  assert.equal(daysUntilBirthday({ day: 1, month: 1 }, new Date('2026-12-31T08:00:00Z')), 1);
});

const guildId = '12345678901234567', userId = '23456789012345678';
const key = `birthday:${guildId}:${userId}`;
function legacyFixture(send = async () => {}) {
  let saves = 0;
  const state = { [key]: '09.11.' };
  return {
    settings: { enabled: true, websiteCalendarEnabled: false, hour: 9, channelId: '34567890123456789', message: 'Happy {user}' },
    state, now: new Date('2026-11-09T09:00:00Z'),
    client: { channels: { fetch: async () => ({ guildId, isTextBased: () => true, send }) } },
    saveState: () => { saves++; }, saves: () => saves
  };
}

test('legacy sender persists only successful sends and sends once per year', async () => {
  let sent = 0;
  const fixture = legacyFixture(async payload => { sent++; assert.deepEqual(payload.allowedMentions, { parse: [], users: [userId] }); });
  await sendLegacyBirthdays(fixture);
  await sendLegacyBirthdays(fixture);
  assert.equal(sent, 1);
  assert.equal(fixture.saves(), 1);
  assert.equal(fixture.state[`${key}:sent:2026`], true);
});

test('failed sends retry without claiming success', async () => {
  let attempts = 0;
  const fixture = legacyFixture(async () => { attempts++; throw new Error('offline'); });
  await sendLegacyBirthdays(fixture);
  await sendLegacyBirthdays(fixture);
  assert.equal(attempts, 2);
  assert.equal(fixture.state[`${key}:sent:2026`], undefined);
  assert.equal(fixture.saves(), 0);
});

test('website mode, wrong guild, missing channel and early hour do not send', async () => {
  let sent = 0;
  const fixture = legacyFixture(async () => { sent++; });
  fixture.settings.websiteCalendarEnabled = true;
  await sendLegacyBirthdays(fixture);
  fixture.settings.websiteCalendarEnabled = false;
  fixture.settings.channelId = '';
  await sendLegacyBirthdays(fixture);
  fixture.settings.channelId = '34567890123456789';
  fixture.now = new Date('2026-11-09T06:00:00Z');
  await sendLegacyBirthdays(fixture);
  fixture.now = new Date('2026-11-09T10:00:00Z');
  fixture.client.channels.fetch = async () => ({ guildId: 'wrong', isTextBased: () => true, send: async () => { sent++; } });
  await sendLegacyBirthdays(fixture);
  assert.equal(sent, 0);
  assert.equal(fixture.saves(), 0);
});

test('command upsert preserves website and other foreign commands', async () => {
  const calls = [];
  const rest = {
    get: async () => [{ id: '1', name: 'geburtstage', type: 1 }, { id: '2', name: 'geburtstag', type: 1 }],
    post: async (route, payload) => calls.push(['post', route, payload.body.name]),
    patch: async (route, payload) => calls.push(['patch', route, payload.body.name])
  };
  await upsertCommands(rest, '/commands', [{ name: 'geburtstag' }, { name: 'bot' }, { name: 'bot' }]);
  assert.deepEqual(calls, [['patch', '/commands/2', 'geburtstag'], ['post', '/commands', 'bot']]);
});
