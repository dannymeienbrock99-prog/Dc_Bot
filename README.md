# Crazy Bot / Kori

Crazy Bot ist meine eigene Discord-Bot-Entwicklung unter **Crazy_Batto**. Der sichtbare Name ist **Kori**. Der Bot ist kein offizieller Discord-Bot und gehört nicht zu Sapphire. Bot-Hosting.net ist nur der Hoster.

## Schnellstart

1. Node.js 20 oder neuer installieren.
2. `.env.example` nach `.env` kopieren und `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` sowie optional `DISCORD_GUILD_ID` eintragen. Tokens gehören ausschließlich in `.env` oder in die geheimen Umgebungsvariablen des Hosters.
3. Für das Dashboard einen langen `DASHBOARD_ACCESS_KEY` als Secret setzen. Bei öffentlichem Hosting `DASHBOARD_HOST=0.0.0.0` setzen und HTTPS über den Hoster aktivieren.
4. `npm install`, dann `npm start`.
5. Dashboard lokal unter `http://127.0.0.1:3210` öffnen. Serverkanäle und Rollen dort eintragen.

Der Bot braucht mindestens **Kanäle ansehen, Nachrichten senden, Einbettungen senden, Nachrichtenverlauf lesen, Rollen verwalten** und für Tickets **Kanäle verwalten**. „Mitglieder-Intent“ und „Nachrichteninhalte-Intent“ müssen im Discord Developer Portal eingeschaltet sein. Die Kori-Rolle muss in der Server-Rollenliste über den Rollen stehen, die Kori verwalten soll.

## Befehle

- `/bot status`
- `/regeln veroeffentlichen`
- `/hangman start`
- `/gaming_setup bearbeiten`
- `/geburtstag kalender`, `/geburtstag anzeigen`, `/geburtstag speichern`, `/geburtstag entfernen`
- `/ticket`
- `/beschweren`
- `/bewerbung art:Moderator`, `art:Produkttester` oder `art:Entbannung`
- `/dashboard`
- Eigene Slash-Befehle aus dem Dashboard

Mitglieder schreiben Zahlen im eingestellten Zählkanal. Eine falsche Zahl setzt die Runde zurück. Hangman-Rollen und Zählrollen lassen sich getrennt konfigurieren.

## Stand der Funktionen

Bereits enthalten: deutsches Dashboard mit Schlüssel, Regelbutton und Mitgliedsrolle, Kanalzugang pro neuem Mitglied, Zählspiel und Hangman mit Rollenfreigaben, Setup-Formular, Geburtstage, Wörterfilter mit Verwarnung/Timeout/Bann, private Tickets, Beschwerde- und Bewerbungsformulare mit getrennten Einreichungs- und Prüfrollen, eigene Slash-Befehle sowie Rollenpräfixe und Rollenfarben.

Noch auszubauen: vollständiger Plattform-Rollenpicker, Bilder und Komponenten im Setup, Soundwiedergabe, Ticket-Transkript und Wiederöffnung, Beweisdatei-Uploads, individuelle Vorlagen pro Formular, TikTok-Abfrage, wiederkehrende Werbeplanung, ausführliche Moderationsprotokolle und geschützter separater Entbannungsweg. TikTok benötigt eine zuverlässige Datenquelle/API; Discord kann normalen Text nicht beliebig pro Namensbestandteil einfärben.

Dies ist eine neu zusammengesetzte Testbasis, kein fertiger öffentlicher Produktivbetrieb. Prüfe Berechtigungen und Einstellungen zuerst auf einem Testserver.

## Gemeinsamer Geburtstagskalender mit crazybatto.de

Der Website-Kalender ist standardmäßig aktiviert. `/geburtstag kalender` und `/geburtstag anzeigen` lesen die freigegebenen Einträge von `https://crazybatto.de/api/birthdays/calendar` und verlinken auf `https://crazybatto.de/geburtstage.html`. Der öffentliche Feed enthält nur Anzeigename, Tag, Monat und Angaben zum nächsten Geburtstag; keine E-Mail, kein Geburtsjahr und keine Zugangsdaten. Nicht freigegebene Einträge werden von der Webseite nicht geliefert.

Mitglieder erfassen und ändern ihren Geburtstag im Website-Konto. `/geburtstag speichern` und `/geburtstag entfernen` zeigen im gemeinsamen Modus den passenden Website-Link, statt eine zweite Datensammlung anzulegen. Vorhandene lokale Geburtstage werden nicht automatisch veröffentlicht oder übertragen.

Die Website übernimmt Erinnerungen und Geburtstagsgrüße sowie deren Kanal- und Nachrichteneinstellungen. Der lokale Geburtstagsversand von Kori ist im gemeinsamen Modus ausgeschaltet, damit keine doppelten Nachrichten entstehen. Im Kori-Dashboard unter **Community → Geburtstage** lässt sich die Website-Adresse einstellen. Der Feedpfad bleibt immer `/api/birthdays/calendar` auf derselben HTTPS-Domain. Dafür ist kein API-Schlüssel nötig.

Die Website muss ihr Update bereits ausführen und der Bot-Host muss sie per HTTPS erreichen können. Danach diesen Bot-Stand auf Bot-Hosting.net installieren und neu starten. Die vorhandenen Discord- und Dashboard-Secrets bleiben in den Umgebungsvariablen des Hosters. Kori gleicht seine Slash-Befehle einzeln ab; der von der Website verwaltete Befehl `/geburtstage` bleibt erhalten. Entfernte eigene Dashboard-Befehle werden nicht mehr automatisch aus Discord gelöscht, damit unabhängig verwaltete Befehle geschützt bleiben.

Bei ausgeschaltetem Website-Kalender kann der bisherige lokale Modus weiter verwendet werden. Er prüft echte Kalenderdaten, nutzt Europe/Berlin und behandelt den 29. Februar in Nichtschaltjahren als 28. Februar. Ein Gruß wird erst nach erfolgreichem Versand als erledigt gespeichert; fehlende Kanäle oder vorübergehende Fehler werden erneut versucht. Der Kanal muss zum Server des Geburtstags gehören.

Prüfung ohne Bot-Anmeldung: `npm test` und `npm run check`. Die Tests senden keine Discord-Nachrichten.

