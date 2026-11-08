# Datenschutzerklärung / Privacy Policy

*Zuletzt aktualisiert / Last updated: 2026*

[English version below](#privacy-policy)

---

## Datenschutzerklärung

**1. Datenerfassung und -nutzung**  
Die Browser-Erweiterung **Zoom & Drag** arbeitet vollständig lokal auf Ihrem Gerät. Die Erweiterung sammelt, speichert, überträgt oder verarbeitet keinerlei personenbezogene Daten, Telemetriedaten, Tracking-Informationen oder Nutzungsanalysen an den Entwickler oder Dritte. Alle in der Erweiterung vorgenommenen Einstellungen werden ausschließlich im lokalen Speicher Ihres Browsers (`storage.local`) abgelegt.

**2. Berechtigungen & technischer Hintergrundabruf (CORS-Fallback)**  
Die Erweiterung benötigt minimale Berechtigungen, um ordnungsgemäß zu funktionieren:
* `storage`: Wird ausschließlich verwendet, um Ihre Nutzereinstellungen (wie Zoom-Stufen, Rotationsschritte, Tastatur-Shortcuts, Rahmenfarben, bevorzugtes Exportformat und Domain-Ausschlüsse) sowie den lokalen Statushinweis nach einem Versions-Update lokal auf Ihrem Gerät zu speichern.
* `contextMenus`: Wird verwendet, um Schnellzugriffe und Aktionen im Rechtsklick-Kontextmenü des Browsers bereitzustellen.
* Webseitenzugriff (`host_permissions` / `<all_urls>`): Wird benötigt, um Skripte und Styles bereitzustellen, damit Sie Bilder und Hintergrundgrafiken auf besuchten Webseiten vergrößern, drehen, anpassen, am Bildschirm fixieren und verschieben können. Zudem wird dies genutzt, um die Adresse der geöffneten Tabs mit Ihrer Ausschlussliste abzugleichen (Toolbar-Popup und rote Kennzeichnung des Symbols auf deaktivierten Seiten). Dieser Abgleich erfolgt ausschließlich lokal; Tab-Adressen werden nicht gespeichert oder übertragen. Die Erweiterung wertet auf der Seite lokal nur Bildelemente und deren Attribute aus (z. B. Bildadresse und Größe). Webtexte, Formulareingaben oder Ihr Browserverlauf werden zu keinem Zeitpunkt gelesen, gespeichert oder übertragen.

*Lokaler Bildexport, Zwischenablage und CORS-Fallback:*  
Wenn Sie im Anpassungs-Panel ausdrücklich auf „Speichern“ oder „In Zwischenablage kopieren“ klicken, wird das bearbeitete Bild lokal im Browser-Canvas erzeugt. Blockiert der Quell-Server des Bildes den direkten Export im Kontext der Webseite aufgrund von Cross-Origin-Sicherheitsrichtlinien (CORS), ruft das Hintergrund-Skript der Erweiterung die Bilddatei im Auftrag des Nutzers direkt von der Bild-URL ab (beschränkt auf sichere HTTP/HTTPS-Ziele und Bild-Medientypen, unter Ausschluss lokaler/privater Netzwerkziele), wandelt sie lokal im Arbeitsspeicher um und stellt sie für den lokalen Download bzw. die Zwischenablage bereit. Ist optional das Nachladen größerer Bildversionen beim freien Zoomen aktiviert (Opt-in), lädt Ihr Browser beim Vergrößern zudem die von der Webseite verlinkte höher aufgelöste Bilddatei direkt vom jeweiligen Bild-Server nach. Diese Verbindungen finden ausschließlich direkt zwischen Ihrem Browser und dem jeweiligen Bild-Server statt. Es werden hierbei keinerlei Bilddaten oder URLs an den Entwickler oder unbeteiligte Dritte gesendet.

**3. Remote-Code & Drittanbieter-Dienste**  
Die Erweiterung verwendet keinen Remote-Code, keine externen Bibliotheken (z. B. CDNs) und keine Analyse- oder Tracking-Dienste von Drittanbietern. Alle Skripte und Ressourcen werden vollständig lokal aus dem Erweiterungspaket ausgeführt.

**4. Externe Links & freiwillige Unterstützung (Ko-fi, GitHub Sponsors, Stripe)**  
Die Erweiterung enthält im Einstellungsmenü eine Schaltfläche „Projekt unterstützen“ (Weiterleitung zu Ko-fi) sowie bei Neuinstallation oder auf der Einstellungsseite einen Link zum Changelog auf GitHub. Darüber hinaus werden im GitHub-Repository unter „GitHub Sponsors“ weitere freiwillige Unterstützungswege (u. a. ein direkter Stripe-Bezahllink) angeboten.  
Wenn Sie diese externen Links anklicken, verlassen Sie die lokale Erweiterung. Auf den Zielseiten gelten ausschließlich die Datenschutzbestimmungen und Nutzungsbedingungen des jeweiligen Anbieters (GitHub, Ko-fi, Stripe). **Zoom & Drag selbst erfasst, verarbeitet oder hat zu keinem Zeitpunkt Zugriff auf Zahlungs-, Kreditkarten- oder Bankdaten.**

**5. Verantwortlicher & Kontakt**  
Verantwortlicher im Sinne der Datenschutzgesetze sind die im [Impressum](IMPRINT.md) genannten Kontaktdaten (Patrick Scholz, E-Mail: pscholz@mail.online-impressum.de).  
Bei Fragen zum Datenschutz oder zum Projekt können Sie zudem jederzeit ein Issue im GitHub-Repository eröffnen:  
https://github.com/pscholz-src/zoom-and-drag/issues

---

## Privacy Policy

**1. Data Collection and Usage**  
The browser extension **Zoom & Drag** operates entirely locally on your device. The extension does not collect, store, transmit, or process any personal data, telemetry data, tracking information, or usage analytics to the developer or any third party. All settings configured within the extension are saved exclusively in your browser's local storage (`storage.local`).

**2. Permissions & Technical Background Fetch (CORS Fallback)**  
The extension requires minimal permissions to provide its core functionality:
* `storage`: Used solely to save and load user preferences (such as zoom steps, rotation angles, keyboard shortcuts, frame colors, preferred export format, and excluded domain lists) as well as the local version update notice flag on your device.
* `contextMenus`: Used to display shortcut controls in the browser's right-click context menu.
* Host Permissions (`<all_urls>`): Required to inject content scripts and styles so users can interact with, zoom, rotate, adjust, pin, and drag images or background graphics across any webpage they visit, and to compare the address of open tabs with your exclusion list (toolbar popup and the red badge shown on disabled sites). This comparison happens locally; tab addresses are never stored or transmitted. On a page, the extension evaluates only image elements and their attributes (such as image address and size) locally. It does not read, collect, store, or transmit page text, form inputs, or browsing history.

*Local Image Export, Clipboard Copy, and CORS Fallback:*  
When you explicitly click "Save" or "Copy to clipboard" in the adjustment panel, the modified image is rendered locally within your browser's canvas. If the image's origin server blocks exporting within the webpage context due to Cross-Origin Resource Sharing (CORS) policies, the extension's background script fetches the image file directly from its URL on your behalf (strictly limited to safe HTTP/HTTPS targets and image MIME types, blocking private/local network targets), converts it in local memory, and triggers your local download or clipboard copy. Additionally, if the optional "Load larger image version in floating zoom" setting (opt-in) is enabled, your browser directly requests the higher-resolution image linked by the webpage from its hosting server while zooming. All such communication occurs strictly between your browser and the server hosting the image. No image data or URLs are ever transmitted to the developer or any third party.

**3. Remote Code & Third-Party Services**  
The extension does not use remote code, external scripts (e.g., CDNs), or third-party analytics services. All assets and logic run entirely offline within the extension package.

**4. External Links & Voluntary Support (Ko-fi, GitHub Sponsors, Stripe)**  
The extension's options page contains a "Support the project" button (linking to Ko-fi) as well as a link to the changelog on GitHub (also opened upon initial installation). Additionally, the GitHub repository offers voluntary sponsorship options under "GitHub Sponsors" (including a direct Stripe payment link).  
When you click these external links, you leave the extension and are redirected to external websites governed by the privacy policies and terms of service of the respective providers (GitHub, Ko-fi, Stripe). **Zoom & Drag itself never collects, processes, or has access to any payment, credit card, or banking data.**

**5. Controller & Contact**  
For legal contact details of the data controller, please refer to the [Legal Notice](IMPRINT.md) (Patrick Scholz, Email: pscholz@mail.online-impressum.de).  
If you have any questions regarding privacy or the extension, you can also open an issue in the GitHub repository:  
https://github.com/pscholz-src/zoom-and-drag/issues

*> In case of any discrepancies or doubts, the German version of this document shall prevail.*