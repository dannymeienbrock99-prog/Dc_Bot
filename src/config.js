import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.DATA_DIR || './data');
fs.mkdirSync(root, { recursive: true });
const file = path.join(root, 'config.json');
const id = '';
export const defaults = {
  botName: 'Kori',
  welcome: { enabled: true, channelId: id, text: 'Willkommen {user} bei {server}! Bitte lies die Regeln und bestätige sie.', imageUrl: '' },
  gate: { enabled: false, rulesChannelId: id, memberRoleId: id, publicChannelIds: [], memberChannelIds: [], rulesText: 'Bitte lies die Regeln und bestätige sie mit dem Button.' },
  counting: { enabled: true, channelId: id, start: 1, allowSameUser: false, allowedRoleIds: [], resetOnWrong: true },
  hangman: { enabled: true, channelId: id, allowedRoleIds: [], words: ['discord', 'gaming', 'computer', 'community'] },
  setups: { enabled: true, allowedRoleIds: [], channelId: id },
  birthdays: { enabled: true, channelId: id, hour: 9, message: 'Alles Gute zum Geburtstag, {user}! 🎂' },
  moderation: { enabled: false, words: [], exemptRoleIds: [], logChannelId: id, timeoutMinutes: 10, banAtThirdStrike: true },
  prefixes: { enabled: true, entries: [], manageRoleIds: [] },
  tickets: { enabled: true, categoryId: id, teamRoleIds: [], panelChannelId: id },
  forms: { enabled: true, reviewChannelId: id, reviewRoleIds: [], submitRoleIds: [] },
  customCommands: [],
  advertising: { enabled: false, channelId: id, posts: [] },
  videos: { enabled: false, channelId: id, accounts: [], mentionRoleId: id },
  dashboard: { ownerIds: [], roleIds: [] }
};

function merge(a, b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return structuredClone(a);
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], v) : v;
  return out;
}
export function readConfig() {
  try { return merge(defaults, JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch { writeConfig(defaults); return structuredClone(defaults); }
}
export function writeConfig(config) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
export function dataPath(name) { return path.join(root, name); }

