import test from 'node:test';
import assert from 'node:assert/strict';
import { PermissionFlagsBits } from 'discord.js';
import { builtinCommands } from '../src/commands.js';

test('all real Discord builders serialize and rules permission is on root command', () => {
  const commands = builtinCommands().map(command => command.toJSON());
  assert.equal(commands.length, 9);
  assert.equal(commands.find(command => command.name === 'regeln').default_member_permissions, String(PermissionFlagsBits.ManageGuild));
  const birthday = commands.find(command => command.name === 'geburtstag');
  assert.deepEqual(birthday.options.map(option => option.name), ['kalender', 'speichern', 'anzeigen', 'entfernen']);
  assert.equal(commands.some(command => command.name === 'geburtstage'), false);
});
