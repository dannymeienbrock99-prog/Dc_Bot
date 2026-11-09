import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export function builtinCommands() {
  return [
    new SlashCommandBuilder().setName('bot').setDescription('Informationen über Kori').addSubcommand(s=>s.setName('status').setDescription('Zeigt den Verbindungsstatus.')),
    new SlashCommandBuilder().setName('regeln').setDescription('Regeln veröffentlichen oder Zugang bestätigen').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addSubcommand(s=>s.setName('veroeffentlichen').setDescription('Regelbestätigung im Kanal veröffentlichen')),
    new SlashCommandBuilder().setName('hangman').setDescription('Hangman spielen').addSubcommand(s=>s.setName('start').setDescription('Startet ein neues Hangman-Spiel')),
    new SlashCommandBuilder().setName('gaming_setup').setDescription('Gaming-Setup verwalten').addSubcommand(s=>s.setName('bearbeiten').setDescription('Setup anlegen oder bearbeiten')),
    new SlashCommandBuilder().setName('geburtstag').setDescription('Geburtstage ansehen und verwalten').addSubcommand(s=>s.setName('kalender').setDescription('Die nächsten Geburtstage der Community ansehen')).addSubcommand(s=>s.setName('speichern').setDescription('Geburtstag verwalten oder im lokalen Modus speichern').addStringOption(o=>o.setName('datum').setDescription('TT.MM. (nur im lokalen Modus)').setRequired(false))).addSubcommand(s=>s.setName('anzeigen').setDescription('Geburtstagskalender oder lokal gespeicherten Geburtstag anzeigen')).addSubcommand(s=>s.setName('entfernen').setDescription('Geburtstag verwalten oder im lokalen Modus entfernen')),
    new SlashCommandBuilder().setName('beschweren').setDescription('Private Beschwerde über ein Mitglied einreichen').addUserOption(o=>o.setName('mitglied').setDescription('Gemeldete Person').setRequired(true)),
    new SlashCommandBuilder().setName('bewerbung').setDescription('Bewerbung oder Antrag einreichen').addStringOption(o=>o.setName('art').setDescription('Formularart').setRequired(true).addChoices({name:'Moderator',value:'Moderatorbewerbung'},{name:'Produkttester',value:'Produkttesterbewerbung'},{name:'Entbannung',value:'Entbannungsantrag'})),
    new SlashCommandBuilder().setName('ticket').setDescription('Privates Support-Ticket öffnen'),
    new SlashCommandBuilder().setName('dashboard').setDescription('Geschützten Dashboard-Link anzeigen')
  ];
}
