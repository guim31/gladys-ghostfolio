# Ghostfolio

Hol deine Geldanlagen in Gladys: das Vermögen, die Performance des Tages, des Jahres und seit Beginn, die
Aufteilung nach Anlageklassen und den Wert jedes Kontos, gelesen aus deinem eigenen
[Ghostfolio](https://ghostfol.io), der Open-Source-Software zur Vermögensverwaltung.

Die Integration liest nur: sie schreibt nie in Ghostfolio und legt nie eine Aktivität an. Die Integration spricht direkt in
deinem Netzwerk mit deinem Ghostfolio, mit dem Sicherheits-Token deines Benutzers. Nicht mit Ghostfolio
verbunden.

## Was du bekommst

- Ein **Portfolio-Gerät**: Gesamtvermögen (inklusive Bargeld), Wert der Positionen, investierter Betrag und
  die Änderung von heute, seit 1. Januar und seit Beginn, als Betrag und in Prozent, mit ihrem Verlauf.
- Ein **Gerät pro Konto** (Broker, Bank, Krypto-Wallet…): sein Wert, sein Bargeld und sein Anteil am
  Portfolio.
- Ein **Dashboard-Widget**: die Zahlen des Portfolios, die Aufteilung nach Anlageklassen und die hinzugefügten
  Konten.
- Ein **Szenen-Auslöser**: das Vermögen oder die Gesamtperformance erreicht ein Allzeithoch.
- Eine **Szenen-Aktion**: das Portfolio vorlesen, als Satz zum Senden per Nachricht oder zum Vorlesen.
- Eine Tagesänderung über ±N % läuft über den Standard-Geräteauslöser von Gladys (siehe Szenenbeispiele).

Alle Beträge sind in der Basiswährung deines Ghostfolio-Benutzers: Ghostfolio rechnet die anderen Währungen um.

## Voraussetzungen

- Gladys Assistant 5.1 oder neuer.
- Ein aktuelles Ghostfolio (getestet mit 3.88.0), selbst gehostet und vom Gladys-Rechner aus erreichbar
  (gleiches Netzwerk, VPN oder öffentliche Adresse).
- Das Sicherheits-Token deines Ghostfolio-Benutzers.

## Konfiguration

### Das Sicherheits-Token finden

Das Sicherheits-Token ist das, mit dem du dich bei Ghostfolio anmeldest: Ghostfolio zeigt es nur einmal, beim
Anlegen des Kontos. Wenn du es nicht aufbewahrt hast, öffne **Mein Ghostfolio → Einstellungen** und erzeuge ein
neues (das alte funktioniert dann nicht mehr, auch nicht zum Anmelden). Ein mit Google- oder OpenID-Anmeldung
angelegtes Konto kann dort ebenfalls eines erzeugen.

### Einstellungen

Öffne in Gladys **Integrationen → Ghostfolio → Konfiguration**:

- **Adresse von Ghostfolio**: die Adresse, unter der du Ghostfolio öffnest, zum Beispiel
  `http://192.168.1.20:3333`. Ohne `http://` wird es ergänzt.
- **Sicherheits-Token**: das Token von oben. Gladys speichert es; die Integration schreibt es nie in ihre
  Protokolle.
- **Selbstsigniertes Zertifikat akzeptieren**: nur für eine `https`-Adresse, deren Zertifikat du selbst
  erstellt hast.
- **Aktualisierungsintervall**: 5 bis 60 Minuten, standardmäßig 15. Ghostfolio aktualisiert seine Kurse selbst.
- **Sprache der Texte**: die Namen der Funktionen (beim Hinzufügen eines Geräts vergeben) und die an Szenen
  gesendeten Sätze. Standardmäßig Französisch.

Speichere und klicke dann auf **Verbindung testen**: die Meldung nennt das Vermögen, die Anzahl der Konten und
die Basiswährung. Öffne den Tab **Entdecken** und füge das Portfolio und die gewünschten Konten hinzu: nur die
hinzugefügten Geräte werden verfolgt.

## Geräte

**Portfolio** (Name „Ghostfolio“):

| Funktion                            | Bedeutung                                                         |
| ----------------------------------- | ----------------------------------------------------------------- |
| Gesamtvermögen                      | Wert der Positionen plus Bargeld der Konten                       |
| Wert                                | Wert der Positionen                                               |
| Investiert                          | Investierter Betrag (Käufe minus Verkäufe)                        |
| Änderung heute / Änderung heute (%) | Nettoperformance des Tages, inklusive Gebühren und Währungseffekt |
| Änderung seit 1. Januar (und %)     | Nettoperformance seit 1. Januar                                   |
| Gesamtperformance (und %)           | Nettoperformance seit der ersten Aktivität                        |

**Konto** (Name wie in Ghostfolio): **Wert** (Positionen und Bargeld des Kontos), **Bargeld** und **Anteil am
Portfolio** in Prozent.

Die Zahlen sind die, die Ghostfolio mit Währungseffekt anzeigt. Wenn du ein Konto in Ghostfolio umbenennst,
bleibt sein Gerät erhalten.

## Dashboard-Widget

Füge das Widget **Ghostfolio-Übersicht** zu einem Dashboard hinzu: Vermögen, investiert, Änderung heute, dieses
Jahr und seit Beginn (grün bei Gewinn, rot bei Verlust), dann der Anteil jeder Anlageklasse (Aktien, Anleihen,
Liquidität…) und die hinzugefügten Konten mit Wert und Anteil. Die Fußzeile nennt die Uhrzeit der letzten
Abfrage.

## Szenen-Auslöser

**Ghostfolio: Allzeithoch**, mit der zu verfolgenden Messgröße:

- **Gesamtvermögen**: das Vermögen übertrifft seinen Höchstwert. Eine Einzahlung zählt auch.
- **Gesamtperformance (%)**: die Gesamtperformance übertrifft ihren Höchstwert; Einzahlungen bewegen sie nicht.

Der Höchstwert stammt beim ersten Lesen des Portfolios aus dem Diagramm von Ghostfolio und folgt dann jedem
neuen Rekord. Das Ereignis wird höchstens einmal pro Tag und Messgröße ausgelöst, egal wie lange der Anstieg
dauert. Variablen: das neue Hoch, das bisherige, die Einheit (Währungscode oder `%`) und ein fertiger Satz.

## Szenen-Aktionen

**Ghostfolio: Portfolio vorlesen** antwortet mit einem Satz, zum Beispiel „Portfolio: 5.629,83 €. Heute
+20,68 € (+0,54 %), seit 1. Januar +6,15 %, seit Beginn +23,90 %.“ Ausgaben: der Satz, das Vermögen, die
Änderung von heute (Betrag und Prozent), die Änderung des Jahres und die Gesamtperformance in Prozent.
Ghostfolio wird erneut gelesen, wenn die letzte Abfrage älter als das Aktualisierungsintervall ist.

## Szenenbeispiele

- **Tagesbilanz**: jeden Abend um 18 Uhr „Ghostfolio: Portfolio vorlesen“, dann den Satz per Telegram senden.
- **Große Bewegung**: Auslöser „Änderung von Gerätestatus“ auf der Funktion **Änderung heute (%)** des
  Portfolios, über 3 (und eine zweite Szene unter -3), mit „Nur ausführen, wenn der Schwellenwert überschritten
  wird“: eine Benachrichtigung, wenn sich die Märkte bewegen.
- **Feiern**: „Ghostfolio: Allzeithoch“ auf der Gesamtperformance, dann ein Licht in Grün und der Satz
  vorgelesen.

## Datenschutz und Daten

- Die Integration liest `api/v1/user`, `api/v2/portfolio/performance` (Zeiträume 1d, ytd und max),
  `api/v1/portfolio/details` und `api/v1/account`. Die Integration meldet sich nur mit dem Sicherheits-Token an
  (`api/v1/auth/anonymous`) und schreibt nie in Ghostfolio.
- Die Protokolle enthalten nie einen Betrag, einen Kontonamen, das Token oder die Adresse des Servers, auch
  nicht auf Debug-Ebene.
- Unter `/data` speichert die Integration die ID des Ghostfolio-Benutzers, die beiden Höchstwerte und den Tag
  des letzten Ereignisses, damit ein Neustart nichts doppelt auslöst.
- Deine Werte bleiben zwischen Gladys und deinem Ghostfolio: kein Drittanbieterdienst.

## Fehlerbehebung

- **„Ghostfolio lehnt das Sicherheits-Token ab“**: das Token wurde erneuert oder falsch abgeschrieben. Erzeuge
  in Mein Ghostfolio → Einstellungen ein neues und füge es erneut ein.
- **„Ghostfolio antwortet nicht“**: prüfe die Adresse vom Gladys-Rechner aus (`curl http://…/api/v1/health`
  sollte `{"status":"OK"}` antworten). Die letzten Werte bleiben erhalten.
- **„Diese Adresse antwortet nicht wie die API von Ghostfolio“**: die Adresse führt woanders hin (eine
  Proxy-Seite, ein anderer Port).
- **Die Zahlen bewegen sich nicht**: Ghostfolio aktualisiert seine Kurse selbst; prüfe seine eigene Seite. Die
  Änderung von heute bleibt bei geschlossenen Märkten auf 0.
- Mehr Details: setze `LOG_LEVEL=debug` für die Integration und lies ihre Protokolle.

## Grenzen

- Nur Lesen; ein einziger Ghostfolio-Benutzer (der des Tokens). Die Cloud von Ghostfolio (ghostfol.io) sollte
  mit ihrer Adresse funktionieren, wurde aber nicht getestet.
- Die Zahlen folgen der Kursaktualisierung und dem Cache von Ghostfolio: manchmal einige Minuten Verzögerung.
- Das Diagramm von Ghostfolio wird über lange Zeiträume ausgedünnt: ein Hoch zwischen zwei Punkten kann beim
  allerersten Lesen entgehen.
- Entwickelt und getestet mit einem echten Ghostfolio 3.88.0 in Docker, mit fiktiven Konten und Anlagen, noch
  nicht auf einer Gladys-Installation mit echtem Portfolio: Rückmeldungen willkommen.
- Nicht mit Ghostfolio verbunden.
