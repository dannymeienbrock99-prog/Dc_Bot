// Register only commands owned by this process. The website's /geburtstage and
// other independently managed commands must survive a Kori restart.
export async function upsertCommands(rest, route, commands) {
  const existing = await rest.get(route);
  const seen = new Set();
  for (const command of commands) {
    const key = `${command.type ?? 1}:${command.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const current = existing.find(item => (item.type ?? 1) === (command.type ?? 1) && item.name === command.name);
    if (current) await rest.patch(`${route}/${current.id}`, { body: command });
    else await rest.post(route, { body: command });
  }
}
