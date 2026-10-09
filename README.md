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
- `/geburtstag speichern`, `/geburtstag anzeigen`, `/geburtstag entfernen`
- `/ticket`
- `/beschweren`
- `/bewerbung art:Moderator`, `art:Produkttester` oder `art:Entbannung`
- `/dashboard`
- Eigene Slash-Befehle aus dem Dashboard

Mitglieder schreiben Zahlen im eingestellten Zählkanal. Eine falsche Zahl setzt die Runde zurück. Hangman-Rollen und Zählrollen lassen sich getrennt konfigurieren.

## Stand der Funktionen

Bereits enthalten: deutsches Dashboard mit Schlüssel, Regelbutton und Mitgliedsrolle, Kanalzugang pro neuem Mitglied, Zählspiel, Hangman, Setup-Formular, Geburtstage, Wörterfilter mit Verwarnung/Timeout/Bann, Tickets, private Beschwerde- und Bewerbungsformulare, eigene Slash-Befehle und rollenbasierte Dashboard-Freigabe.

Noch auszubauen: vollständiger Plattform-Rollenpicker, Bilder und Komponenten im Setup, Soundwiedergabe, Ticket-Transkript und Wiederöffnung, Beweisdatei-Uploads, individuelle Vorlagen pro Formular, TikTok-Abfrage, wiederkehrende Werbeplanung, Rollenpräfixe automatisch auf Nicknames anwenden, ausführliche Moderationsprotokolle und geschützter separater Entbannungsweg. TikTok benötigt eine zuverlässige Datenquelle/API; Discord kann normalen Text nicht beliebig pro Namensbestandteil einfärben.

Dies ist eine neu zusammengesetzte Testbasis, kein fertiger öffentlicher Produktivbetrieb. Prüfe Berechtigungen und Einstellungen zuerst auf einem Testserver.

