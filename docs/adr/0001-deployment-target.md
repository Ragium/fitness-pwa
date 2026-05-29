# ADR 0001 - Deployment cél választása

## Dátum
2025-11-13

## Kontextus
A FitTracker PWA-nak olyan hosting környezet kell, amely:
- támogatja az offline-first buildet (service worker, statikus assetek, HTTP/2 push)
- könnyen összeköthető Firestore backenddel és Firebase Auth-tal
- biztosít olcsó, egyszerű preview környezeteket a sprintközi validáláshoz
- nem igényel dedikált DevOps csapatot, mégis TLS-t és CDN-t ad "dobozból".
Korábbi sprintben Angular + Firebase komponenseket választottunk, ezért most a frontend deploy célját kellett eldönteni (Firebase Hosting vs. Vercel vs. saját VM).

## Döntés
Firebase Hostingot választunk elsődleges deployment célnak. A választást az indokolja, hogy natív integrációt ad a meglévő Firebase projekttel, ingyenes kvótával lehetővé teszi a preview csatornákat, és minimális konfigurációval szolgál ki Angular buildet ( `firebase deploy --only hosting` ).

## Alternatívák
- **Vercel**  
  - *Előnyök:* automatikus preview, jó DX, edge cache.  
  - *Hátrányok:* Firebase Auth/Firestore integrációhoz külön környezeti változók és custom rewrites kellenek, a free tier korlátozott SSR/edge futást időben, és plusz szolgáltató kerül be a stackbe.  
  - *Miért nem most?* A projekt jelenleg teljesen Firebase ökoszisztémára épít, így a Vercel + Firebase kombináció többlet konfigurációt okozna.
- **Saját VM (pl. Hetzner/DO)**  
  - *Előnyök:* teljes kontroll, bármilyen build pipeline, opcionális Docker futtatás.  
  - *Hátrányok:* patch menedzsment, TLS beállítás, CDN hiány, magasabb üzemeltetési költség és zéró preview automatizmus.  
  - *Miért nem most?* Sprint 2-3 fókusza a funkciók kockázatmentes validációja, nem a szerverüzemeltetés megtanulása.

## Következmények
### Pozitív
- Egységes Firebase projekt: hosting, auth, Firestore, analytics egy konzolból kezelhető.
- Preview channel-ekkel minden PR-re automatikus URL generálás, ami támogatja a konzultáns review-t.
- Beépített CDN + HTTP/2, így teljesíthető a TTFB NFR.

### Negatív/Kockázatok
- Függés a Firebase kvótáktól: ha toborzás után nő a forgalom, fizetős csomagra kell váltani.
- Limitált server-side logika: csak statikus vagy Cloud Functions proxyn keresztül bővíthető.
- Vendor lock-in: későbbi multi-cloud stratégia nehezebb.

### Mitigációk
- A build pipeline-ban megtartjuk az `npm run build` + `firebase deploy` lépéseket GitHub Actions sablonban, így később Vercel/Netlify felé is exportálható az artefakt. 
- A Cloud Functions helyett a domain logikát továbbra is a kliens + Firestore Security Rules párosba tesszük, így könnyebb új hosztra költözni.
- Kvóta figyelő alertet állítunk be a Firebase konzolban, hogy időben jelezzen a költség növekedéséről.
