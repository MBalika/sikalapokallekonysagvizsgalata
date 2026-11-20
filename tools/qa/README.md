# Átnéző eszközök (Playwright + Chromium, szoftveres WebGL)

Az oktatóappok átnézéséhez (lásd az „oktatoapp-atnezes” skillt). Mind helyi szerverről fut:
`python3 -m http.server 8850` a repó gyökerében, majd pl. `python3 _src/qa/audit.py http://localhost:8850/ hu`.

| Eszköz | Mire való |
|---|---|
| `audit.py url hu\|en [szélességek]` | 390/768/1440/1920 px-en: vízszintes túlcsordulás, lyukas sorkizárt sor, tiltott sorvég, nem középre zárt dobozcím, U+200B, konzolhiba, tétlen oldal DOM-módosításai; angol oldalon a bent maradt magyar szavak és tizedesvesszők |
| `scan.py url mappa szélesség [magasság] [téma]` | az egész oldal végigfényképezése képernyőnként |
| `sheet.py "minta" ki.jpg oszlop [arány]` | a képek összefűzése egy áttekintő lapra |
| `tabs_full.py url mappa szélesség "<fülgombok>"` | fejezetfüles appnál fejezetenként teljes oldalas kép (az `audit.py --tabs "<fülgombok>"` párja) |
| `els.py url mappa szélesség téma szelektor…` | egy-egy elem (labor, kártyasor) fényképe; `szelektor@@n` az n-edik találat |
| `labs.py`, `toro_states.py`, `alapsik_states.py` | interaktív laborok állapotainak végigkattintása (minta a többi apphoz) |

A lyuk határa 1,25 em-nyi szóköz; a tiltott sorvégek a formázás skill listáját követik (magyar: a, az, s, e, és, egy, számnév, rövidítés; angol: a, an, the, rövidítés).
