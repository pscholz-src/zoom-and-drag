# Datenschutzerklärung / Privacy Policy

*Zuletzt aktualisiert / Last updated: 2026*

[English version below](#privacy-policy)

---

## Datenschutzerklärung

**1. Datenerfassung und -nutzung**  
Die Browser-Erweiterung **Zoom & Drag** arbeitet vollständig lokal auf Ihrem Gerät. Die Erweiterung sammelt, speichert, überträgt oder verarbeitet keinerlei personenbezogene Daten, Telemetriedaten, Tracking-Informationen oder Nutzungsanalysen an den Entwickler oder Dritte. Alle in der Erweiterung vorgenommenen Einstellungen werden ausschließlich im lokalen Speicher Ihres Browsers (`storage.local`) abgelegt.

**2. Berechtigungen & technischer Hintergrundabruf (CORS-Fallback)**  
Die Erweiterung benötigt minimale Berechtigungen, um ordnungsgemäß zu funktionieren:
* `storage`: Wird ausschließlich verwendet, um Ihre Nutzereinstellungen (wie Zoom-Stufen, Rotationsschritte, Tastatur-Shortcuts und Domain-Ausschlüsse) sowie den lokalen Statushinweis nach einem Versions-Update lokal auf Ihrem Gerät zu speichern.
* `contextMenus`: Wird verwendet, um Schnellzugriffe und Aktionen im Rechtsklick-Kontextmenü des Browsers bereitzustellen.
* Webseitenzugriff (`host_permissions` / `<all_urls>`): Wird benötigt, um Skripte und Styles bereitzustellen, damit Sie Bilder und Hintergrundgrafiken auf besuchten Webseiten vergrößern, drehen, anpassen und verschieben können. Die Erweiterung überwacht, liest, speichert oder überträgt zu keinem Zeitpunkt Seiteninhalte, Webtexte, Formulareingaben oder Ihren Browserverlauf.

*Lokaler Bildexport und CORS-Fallback:*  
Wenn Sie im Anpassungs-Panel ausdrücklich auf „Speichern“ klicken, wird das bearbeitete Bild lokal im Browser-Canvas erzeugt. Blockiert der Quell-Server des Bildes den direkten Export im Kontext der Webseite aufgrund von Cross-Origin-Sicherheitsrichtlinien (CORS), ruft das Hintergrund-Skript der Erweiterung die Bilddatei im Auftrag des Nutzers direkt von der ursprünglichen Bild-URL ab (unter Nutzung des bestehenden Browser-Kontexts, beschränkt auf HTTP/HTTPS und Bild-Medientypen), wandelt sie lokal im Arbeitsspeicher in eine Daten-URL um und stellt sie für den lokalen Download bereit. Diese Verbindung findet ausschließlich direkt zwischen Ihrem Browser und dem ursprünglichen Bild-Server statt. Es werden hierbei keinerlei Bilddaten oder URLs an den Entwickler oder unbeteiligte Dritte gesendet.

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
* `storage`: Used solely to save and load user preferences (such as zoom steps, rotation angles, keyboard shortcuts, and excluded domain lists) as well as the local version update notice flag on your device.
* `contextMenus`: Used to display shortcut controls in the browser's right-click context menu.
* Host Permissions (`<all_urls>`): Required to inject content scripts and styles so users can interact with, zoom, rotate, adjust, and drag images or background graphics across any webpage they visit. The extension does not monitor, read, collect, or transmit any webpage content, DOM text, form inputs, or browsing history.

*Local Image Export and CORS Fallback:*  
When you explicitly click "Save" in the adjustment panel, the modified image is rendered locally within your browser's canvas. If the image's origin server blocks exporting within the webpage context due to Cross-Origin Resource Sharing (CORS) policies, the extension's background script fetches the image file directly from its original URL on your behalf (using your browser's standard request context, strictly limited to HTTP/HTTPS and image MIME types), converts it in local memory, and triggers your local download. This communication occurs strictly between your browser and the server hosting the image. No image data or URLs are ever transmitted to the developer or any third party.

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