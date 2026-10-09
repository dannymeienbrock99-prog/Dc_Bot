import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, EmbedBuilder, Events, GatewayIntentBits, ModalBuilder, PermissionFlagsBits, REST, Routes, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { dataPath, readConfig, writeConfig } from './config.js';

const env = process.env;
if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID) throw new Error('DISCORD_TOKEN und DISCORD_CLIENT_ID müssen als sichere Umgebungsvariablen gesetzt sein.');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const stateFile = dataPath('state.json');
let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { }
const saveState = () => fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
let config = readConfig();
const userHasAny = (member, roles) => !roles?.length || roles.some(id => member.roles.cache.has(id));
const roleIdPattern = /^\d{17,20}$/;
const slash = [
  new SlashCommandBuilder().setName('bot').setDescription('Informationen über Kori').addSubcommand(s=>s.setName('status').setDescription('Zeigt den Verbindungsstatus.')),
  new SlashCommandBuilder().setName('regeln').setDescription('Regeln veröffentlichen oder Zugang bestätigen').addSubcommand(s=>s.setName('veroeffentlichen').setDescription('Regelbestätigung im Kanal veröffentlichen').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)),
  new SlashCommandBuilder().setName('hangman').setDescription('Hangman spielen').addSubcommand(s=>s.setName('start').setDescription('Startet ein neues Hangman-Spiel')),
  new SlashCommandBuilder().setName('gaming_setup').setDescription('Gaming-Setup verwalten').addSubcommand(s=>s.setName('bearbeiten').setDescription('Setup anlegen oder bearbeiten')),
  new SlashCommandBuilder().setName('geburtstag').setDescription('Geburtstag verwalten').addSubcommand(s=>s.setName('speichern').setDescription('Geburtstag speichern').addStringOption(o=>o.setName('datum').setDescription('TT.MM.').setRequired(true))).addSubcommand(s=>s.setName('anzeigen').setDescription('Gespeicherten Geburtstag anzeigen')).addSubcommand(s=>s.setName('entfernen').setDescription('Geburtstag entfernen')),
  new SlashCommandBuilder().setName('beschweren').setDescription('Private Beschwerde über ein Mitglied einreichen').addUserOption(o=>o.setName('mitglied').setDescription('Gemeldete Person').setRequired(true)),
  new SlashCommandBuilder().setName('bewerbung').setDescription('Bewerbung oder Antrag einreichen').addStringOption(o=>o.setName('art').setDescription('Formularart').setRequired(true).addChoices({name:'Moderator',value:'Moderatorbewerbung'},{name:'Produkttester',value:'Produkttesterbewerbung'},{name:'Entbannung',value:'Entbannungsantrag'})),
  new SlashCommandBuilder().setName('ticket').setDescription('Privates Support-Ticket öffnen'),
  new SlashCommandBuilder().setName('dashboard').setDescription('Geschützten Dashboard-Link anzeigen')
];
function commands() {
  const dynamic = (config.customCommands || []).filter(c=>c.enabled && /^[a-z0-9_-]{1,32}$/.test(c.name||'')).map(c=>new SlashCommandBuilder().setName(c.name).setDescription(String(c.description||'Eigener Serverbefehl').slice(0,100)));
  return [...slash, ...dynamic].map(c=>c.toJSON());
}
async function register() {
  const rest = new REST({ version:'10' }).setToken(env.DISCORD_TOKEN);
  const route = env.DISCORD_GUILD_ID ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID) : Routes.applicationCommands(env.DISCORD_CLIENT_ID);
  await rest.put(route, { body:commands() });
}
function isAdmin(interaction) {
  const owner = config.dashboard.ownerIds?.includes(interaction.user.id) || interaction.guild?.ownerId === interaction.user.id;
  const roles = config.dashboard.roleIds || [];
  return owner || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || userHasAny(interaction.member, roles);
}
const textInput = (id,label,style=TextInputStyle.Short,required=true,placeholder='') => new TextInputBuilder().setCustomId(id).setLabel(label.slice(0,45)).setStyle(style).setRequired(required).setMaxLength(style===TextInputStyle.Paragraph?1000:100).setPlaceholder(placeholder);
function modal(title, id, fields) { const m=new ModalBuilder().setTitle(title.slice(0,45)).setCustomId(id); for(const f of fields)m.addComponents(new ActionRowBuilder().addComponents(f)); return m; }
async function sendPrivateReview(interaction, type, answers) {
  const dest=config.forms.reviewChannelId;
  const channel=dest ? await client.channels.fetch(dest).catch(()=>null) : null;
  if(!channel?.isTextBased()) return interaction.reply({content:'Das Moderationsteam hat noch keinen Eingangskanal eingerichtet. Bitte wende dich direkt an die Moderation.',ephemeral:true});
  const reviewerRoles=config.forms.reviewRoleIds||[];
  if(!reviewerRoles.length)return interaction.reply({content:'Die Moderation hat noch keine Rollen für den privaten Eingang festgelegt. Bitte wende dich direkt an die Moderation.',ephemeral:true});
  const submitRoles=config.forms.submitRoleIds||[];
  if(!userHasAny(interaction.member,submitRoles))return interaction.reply({content:'Deine Rollen dürfen dieses Formular nicht einreichen.',ephemeral:true});
  try{
    await channel.permissionOverwrites.edit(interaction.guildId,{ViewChannel:false});
    for(const roleId of reviewerRoles){if(!interaction.guild.roles.cache.has(roleId))throw new Error('Prüfrolle nicht gefunden');await channel.permissionOverwrites.edit(roleId,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});}
  }catch{return interaction.reply({content:'Der Eingangskanal konnte nicht sicher auf die Prüfrollen beschränkt werden. Die Beschwerde wurde nicht versendet; bitte informiere die Moderation.',ephemeral:true});}
  const embed=new EmbedBuilder().setTitle(type).setColor(0x5865f2).setTimestamp().addFields({name:'Eingereicht von',value:`${interaction.user.tag} (${interaction.user.id})`},...answers.map(([name,value])=>({name,value:String(value||'—').slice(0,1024)})));
  await channel.send({embeds:[embed],allowedMentions:{parse:[]}});
  return interaction.reply({content:'Danke! Deine Angaben wurden privat an die zuständige Moderation übermittelt.',ephemeral:true});
}
client.once(Events.ClientReady, async ready=>{ await register(); console.log(`Kori online: ${ready.user.tag}`); setInterval(()=>checkBirthdays().catch(console.error),60_000); });
client.on(Events.GuildMemberAdd, async member=>{
  if(config.gate.enabled){
    for(const channel of member.guild.channels.cache.values()) if(channel.type!==ChannelType.GuildCategory) await channel.permissionOverwrites.edit(member.id,{ViewChannel:(config.gate.publicChannelIds||[]).includes(channel.id) || channel.id===config.gate.rulesChannelId}).catch(()=>{});
  }
  if(config.welcome.enabled && config.welcome.channelId){const ch=await client.channels.fetch(config.welcome.channelId).catch(()=>null); if(ch?.isTextBased()) await ch.send({content:config.welcome.text.replaceAll('{user}',member.toString()).replaceAll('{server}',member.guild.name),allowedMentions:{users:[member.id]}}).catch(()=>{});}
  await syncPrefix(member);
});
client.on(Events.GuildMemberUpdate, async (_before, member)=>syncPrefix(member));
async function syncPrefix(member){
  if(!config.prefixes?.enabled)return;
  const key=`nickname:${member.guild.id}:${member.id}`;
  const saved=state[key];
  const base=saved?.base ?? (member.nickname||member.user.username);
  const entry=[...(config.prefixes.entries||[])].filter(x=>x.roleId&&member.roles.cache.has(x.roleId)).sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0))[0];
  const nickname=(entry?`${entry.prefix||''} ${base}`.trim():base).slice(0,32);
  if((member.nickname||member.user.username)!==nickname)await member.setNickname(nickname,'Crazy Bot: Rollenpräfix').catch(()=>{});
  if(entry)state[key]={base};else delete state[key];
  saveState();
}
client.on(Events.MessageCreate, async message=>{
  if(!message.guild || message.author.bot) return;
  if(config.gate.enabled && config.gate.rulesChannelId===message.channelId && message.content.trim().toLowerCase()==='akzeptieren') return message.reply('Bitte nutze den Button „Regeln akzeptieren“ unter der Regelmeldung.');
  if(config.counting.enabled && message.channelId===config.counting.channelId && /^\d+$/.test(message.content.trim())){
    if(!userHasAny(message.member,config.counting.allowedRoleIds)) return message.delete().catch(()=>{});
    const key=`count:${message.guildId}`, current=Number(state[key]||0), next=Number(message.content.trim());
    if(next===current+1 && (config.counting.allowSameUser || state[`${key}:user`]!==message.author.id)){state[key]=next;state[`${key}:user`]=message.author.id;saveState();await message.react('✅').catch(()=>{});}
    else if(config.counting.resetOnWrong){state[key]=0;state[`${key}:user`]='';saveState();await message.react('❌').catch(()=>{});}
  }
  if(config.hangman.enabled && message.channelId===config.hangman.channelId && state[`hang:${message.guildId}`]){
    if(!userHasAny(message.member,config.hangman.allowedRoleIds))return;
    const game=state[`hang:${message.guildId}`], guess=message.content.trim().toLowerCase();
    if(guess.length!==1)return;
    if(game.word.includes(guess))game.found=[...new Set([...game.found,guess])];else game.wrong++;
    const shown=[...game.word].map(c=>game.found.includes(c)?c:'＿').join(' ');
    if([...game.word].every(c=>game.found.includes(c))){delete state[`hang:${message.guildId}`];saveState();await message.reply(`🎉 Gewonnen! Das Wort war **${game.word}**.`);}
    else if(game.wrong>=7){delete state[`hang:${message.guildId}`];saveState();await message.reply(`Das Spiel ist vorbei. Gesucht war **${game.word}**.`);}
    else {saveState();await message.reply(`${shown}  ·  Fehlversuche: ${game.wrong}/7`);}
  }
  if(config.moderation.enabled && config.moderation.words.some(w=>w && message.content.toLowerCase().includes(w.toLowerCase())) && !userHasAny(message.member,config.moderation.exemptRoleIds)){
    await message.delete().catch(()=>{}); const key=`strikes:${message.guildId}:${message.author.id}`, count=Number(state[key]||0)+1;state[key]=count;saveState();
    if(count===1) await message.channel.send(`${message.author} bitte halte dich an die Regeln. Verwarnung.`).catch(()=>{});
    else if(count===2) await message.member.timeout((config.moderation.timeoutMinutes||10)*60_000,'Auto-Moderation').catch(()=>{});
    else if(count>=3 && config.moderation.banAtThirdStrike) await message.member.ban({reason:'Auto-Moderation: wiederholte Verstöße'}).catch(()=>{});
  }
});
client.on(Events.InteractionCreate, async i=>{
  try{
    if(i.isButton() && i.customId==='rules:accept'){
      if(!config.gate.enabled) return i.reply({content:'Der Regelzugang ist derzeit nicht aktiv.',ephemeral:true});
      const role=config.gate.memberRoleId; if(role && i.member.roles?.add) await i.member.roles.add(role);
      for(const id of config.gate.memberChannelIds||[]) {const ch=await i.guild.channels.fetch(id).catch(()=>null); if(ch) await ch.permissionOverwrites.edit(i.user.id,{ViewChannel:true}).catch(()=>{});}
      return i.reply({content:'Regeln akzeptiert. Du hast jetzt Zugang zu den Mitgliederbereichen.',ephemeral:true});
    }
    if(i.isChatInputCommand()){
      const c=readConfig(); config=c;
      if(i.commandName==='bot')return i.reply({content:`${c.botName||'Kori'} ist online. Server: ${client.guilds.cache.size}.`,ephemeral:true});
      if(i.commandName==='regeln'){
        if(!isAdmin(i))return i.reply({content:'Dafür brauchst du eine Verwaltungsrolle.',ephemeral:true});
        const ch=await client.channels.fetch(c.gate.rulesChannelId||i.channelId).catch(()=>null); if(!ch?.isTextBased())return i.reply({content:'Bitte zuerst den Regelkanal im Dashboard einstellen.',ephemeral:true});
        await ch.send({content:c.gate.rulesText,components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('rules:accept').setLabel('Regeln akzeptieren').setStyle(ButtonStyle.Success))]}); return i.reply({content:'Regelmeldung veröffentlicht.',ephemeral:true});
      }
      if(i.commandName==='hangman'){
        if(!userHasAny(i.member,c.hangman.allowedRoleIds))return i.reply({content:'Deine Rollen dürfen Hangman nicht benutzen.',ephemeral:true});
        if(!c.hangman.enabled)return i.reply({content:'Hangman ist deaktiviert.',ephemeral:true});
        const words=c.hangman.words||['discord']; const word=words[Math.floor(Math.random()*words.length)].toLowerCase();state[`hang:${i.guildId}`]={word,found:[],wrong:0};saveState();return i.reply(`Hangman gestartet! Rate einzelne Buchstaben im Kanal.\n${[...word].map(()=> '＿').join(' ')}`);
      }
      if(i.commandName==='gaming_setup'){
        if(!userHasAny(i.member,c.setups.allowedRoleIds))return i.reply({content:'Deine Rollen dürfen kein Setup anlegen.',ephemeral:true});
        return i.showModal(modal('Gaming-Setup','setup:save',[textInput('cpu','CPU',TextInputStyle.Short,false),textInput('gpu','Grafikkarte',TextInputStyle.Short,false),textInput('ram','RAM',TextInputStyle.Short,false),textInput('storage','Speicher',TextInputStyle.Short,false),textInput('extras','Weitere Teile',TextInputStyle.Paragraph,false)]));
      }
      if(i.commandName==='geburtstag'){
        const sub=i.options.getSubcommand(), key=`birthday:${i.guildId}:${i.user.id}`;
        if(sub==='speichern'){const date=i.options.getString('datum');if(!/^\d{2}\.\d{2}\.$/.test(date))return i.reply({content:'Bitte das Datum als TT.MM. angeben.',ephemeral:true});state[key]=date;saveState();return i.reply({content:'Geburtstag gespeichert. Du kannst ihn jederzeit ändern oder entfernen.',ephemeral:true});}
        if(sub==='entfernen'){delete state[key];saveState();return i.reply({content:'Geburtstag entfernt.',ephemeral:true});}
        return i.reply({content:`Gespeichert: ${state[key]||'Noch kein Geburtstag hinterlegt.'}`,ephemeral:true});
      }
      if(i.commandName==='beschweren'){
        const target=i.options.getUser('mitglied');if(target.id===i.user.id)return i.reply({content:'Du kannst keine Beschwerde über dich selbst einreichen.',ephemeral:true});
        return i.showModal(modal('Private Beschwerde','form:complaint',[textInput('reason','Was ist passiert? (Pflichtfeld)',TextInputStyle.Paragraph,true),textInput('channel','Betroffener Kanal (optional)',TextInputStyle.Short,false),textInput('link','Link zur Nachricht (optional)',TextInputStyle.Short,false),textInput('evidence','Beweis-Link (optional)',TextInputStyle.Short,false)]).setCustomId(`form:complaint:${target.id}`));
      }
      if(i.commandName==='bewerbung'){
        const type=i.options.getString('art');return i.showModal(modal(type,'form:application',[textInput('about','Vorstellung / Discord-Name',TextInputStyle.Short,true),textInput('motivation','Begründung und Angaben',TextInputStyle.Paragraph,true),textInput('experience','Erfahrung / Ergänzungen (optional)',TextInputStyle.Paragraph,false)]).setCustomId(`form:application:${type}`));
      }
      if(i.commandName==='ticket'){
        if(!c.tickets.enabled)return i.reply({content:'Das Ticketsystem ist deaktiviert.',ephemeral:true});
        const channel=await i.guild.channels.create({name:`ticket-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,90),type:ChannelType.GuildText,parent:c.tickets.categoryId||undefined,permissionOverwrites:[{id:i.guild.id,deny:[PermissionFlagsBits.ViewChannel]},{id:i.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},...(c.tickets.teamRoleIds||[]).map(id=>({id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}))]});
        await channel.send({content:`${i.user} – beschreibe dein Anliegen.`,components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:close').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger))]});return i.reply({content:`Dein Ticket wurde erstellt: ${channel}`,ephemeral:true});
      }
      if(i.commandName==='dashboard')return i.reply({content:`Dashboard: ${env.DASHBOARD_PUBLIC_URL||`http://localhost:${env.DASHBOARD_PORT||3210}`}`,ephemeral:true});
      const custom=c.customCommands.find(x=>x.enabled && x.name===i.commandName);if(custom){if(!userHasAny(i.member,custom.roleIds))return i.reply({content:'Du darfst diesen Befehl nicht benutzen.',ephemeral:true});return i.reply({content:String(custom.response||'Befehl ausgeführt.').replaceAll('{user}',i.user.username).slice(0,2000),ephemeral:custom.private!==false});}
    }
    if(i.isModalSubmit()){
      if(i.customId.startsWith('setup:')){const answer=Object.fromEntries(['cpu','gpu','ram','storage','extras'].map(k=>[k,i.fields.getTextInputValue(k)]));state[`setup:${i.guildId}:${i.user.id}`]=answer;saveState();return i.reply({content:'Dein Gaming-Setup wurde gespeichert.',ephemeral:true});}
      if(i.customId.startsWith('form:complaint:')){const target=i.customId.split(':').at(-1);return sendPrivateReview(i,'Beschwerde über Mitglied',[['Gemeldete Person',`<@${target}> (${target})`],['Begründung',i.fields.getTextInputValue('reason')],['Kanal',i.fields.getTextInputValue('channel')],['Nachrichtenlink',i.fields.getTextInputValue('link')],['Beweise',i.fields.getTextInputValue('evidence')]]);}
      if(i.customId.startsWith('form:application:')){const type=i.customId.split(':').slice(2).join(':');return sendPrivateReview(i,type,[['Vorstellung',i.fields.getTextInputValue('about')],['Angaben',i.fields.getTextInputValue('motivation')],['Ergänzungen',i.fields.getTextInputValue('experience')]]);}
    }
    if(i.isButton() && i.customId==='ticket:close'){if(!isAdmin(i) && !i.channel.name.endsWith(i.user.username.toLowerCase()))return i.reply({content:'Nur Ticket-Ersteller oder Team dürfen schließen.',ephemeral:true});await i.channel.delete('Ticket geschlossen').catch(()=>{});}
  }catch(err){console.error(err);if(i.isRepliable()&&!i.replied)await i.reply({content:'Das hat gerade nicht geklappt. Prüfe bitte die Dashboard-Einstellungen.',ephemeral:true}).catch(()=>{});}
});
async function checkBirthdays(){const now=new Date();if(!config.birthdays.enabled||now.getHours()!==(config.birthdays.hour??9))return;for(const [key,date] of Object.entries(state)){if(!key.startsWith('birthday:')||key.includes(':sent:')||date!==`${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.`)continue;const sentKey=`${key}:sent:${now.getFullYear()}`;if(state[sentKey])continue;const [,guildId,userId]=key.split(':');const ch=config.birthdays.channelId&&await client.channels.fetch(config.birthdays.channelId).catch(()=>null);if(ch?.isTextBased())await ch.send({content:config.birthdays.message.replaceAll('{user}',`<@${userId}>`),allowedMentions:{users:[userId]}}).catch(()=>{});state[sentKey]=true;}saveState();}
const app=express();app.use(express.json({limit:'1mb'}));
const accessKey=env.DASHBOARD_ACCESS_KEY||'';
app.use('/api',(req,res,next)=>{if(!accessKey)return res.status(503).json({error:'DASHBOARD_ACCESS_KEY fehlt. Dashboard-Zugang zuerst als Secret einrichten.'});if(req.header('authorization')!==`Bearer ${accessKey}`)return res.status(401).json({error:'Anmeldung erforderlich.'});next();});
app.get('/api/config',(req,res)=>res.json(readConfig()));
app.put('/api/config',async(req,res)=>{const c=req.body;if(!c||typeof c!=='object')return res.status(400).json({error:'Ungültige Einstellungen.'});for(const role of c.prefixes?.entries||[])if(role.roleId&&!roleIdPattern.test(role.roleId))return res.status(400).json({error:'Eine Rollen-ID ist ungültig. Discord-Rollen-IDs bestehen nur aus 17 bis 20 Ziffern.'});for(const roleId of [...(c.forms?.reviewRoleIds||[]),...(c.forms?.submitRoleIds||[])])if(!roleIdPattern.test(roleId))return res.status(400).json({error:'Eine Formular-Rollen-ID ist ungültig. Discord-Rollen-IDs bestehen aus 17 bis 20 Ziffern.'});config=c;writeConfig(config);const targetGuild=env.DISCORD_GUILD_ID&&client.guilds.cache.get(env.DISCORD_GUILD_ID);if(targetGuild&&config.prefixes?.enabled){for(const entry of config.prefixes.entries||[]){if(!entry.roleId||!/^#[a-f\d]{6}$/i.test(entry.color||''))continue;const role=targetGuild.roles.cache.get(entry.roleId);if(role)await role.edit({color:entry.color,reason:'Crazy Bot: Rollenfarbe im Dashboard eingestellt'}).catch(()=>{});}}for(const guild of client.guilds.cache.values())for(const member of guild.members.cache.values())await syncPrefix(member);try{await register();}catch(e){console.error('Befehlsabgleich:',e.message);}res.json({ok:true,message:'Einstellungen gespeichert. Rollenfarben und Präfixe wurden angewendet, soweit Kori die nötigen Rechte besitzt.'});});
app.get('/api/status',(req,res)=>res.json({connected:client.isReady(),bot:client.user?.tag||'Offline',guilds:client.guilds.cache.size,version:'0.3.0'}));
app.get('/api/discord-options',(req,res)=>{const guild=env.DISCORD_GUILD_ID&&client.guilds.cache.get(env.DISCORD_GUILD_ID);res.json({roles:guild?[...guild.roles.cache.values()].map(r=>({id:r.id,name:r.name})):[],channels:guild?[...guild.channels.cache.values()].filter(c=>c.type===ChannelType.GuildText).map(c=>({id:c.id,name:c.name})):[]});});
app.use(express.static(path.resolve('web')));
const host=env.DASHBOARD_HOST||'127.0.0.1';if(host!=='127.0.0.1'&&host!=='localhost'&&!accessKey)throw new Error('Für Netzwerkbetrieb muss DASHBOARD_ACCESS_KEY gesetzt sein.');
app.listen(Number(env.DASHBOARD_PORT||3210),host,()=>console.log(`Dashboard auf http://${host}:${env.DASHBOARD_PORT||3210}`));
await client.login(env.DISCORD_TOKEN);

