# Loft con soppalco: rilievo 3D e redesign

Modello 3D interattivo dello **stato di fatto** di un loft in un edificio
industriale in mattoni, ricostruito dalle planimetrie del piano principale e
del soppalco e dalle foto. Serve come base per il redesign degli interni:
involucro e struttura restano fissi, gli arredi sono un livello separato che
il progetto sostituirà.

## Cosa si può fare

- **Assonometria** a "casa di bambola": i muri rivolti verso chi guarda e il
  tetto si nascondono da soli.
- **Piante** del piano principale (taglio a 1,40 m) e del soppalco (taglio a
  4,50 m) con muri campiti e quote del rilievo.
- **Sezione lunga** (verso nord) e **sezione corta** in asse alla finestra W2
  (verso ovest), con le quote altimetriche.
- **Sei viste come nelle foto**, per confrontare modello e realtà.
- **Metro**: due clic sul modello danno la distanza in centimetri, con
  componenti orizzontale e verticale.
- **Clic su un elemento**: nome, misure e coordinate del punto.
- **Passeggia**: prima persona con W A S D (o i pulsanti su telefono); la scala
  si sale camminando, i parapetti fermano il passo.
- Luce **giorno** o **sera** con le lampade accese; ombre morbide (GTAO)
  disattivabili sui computer lenti.

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/index.html: un unico file, si apre anche offline
```

Parametri utili nell'indirizzo: `?view=planGround` (o `planMezz`, `section`,
`sectionX`, `p1`…`p4`, `m1`, `m2`) apre direttamente una vista.

## Struttura del codice

| File | Contenuto |
| --- | --- |
| `src/survey.js` | Tutte le misure, in cm, con l'indicazione rilievo/stima |
| `src/model/shell.js` | Murature, finestre ad arco, tramezzo, falda e travetti |
| `src/model/structure.js` | Soppalco, pilastri, travi IPE, parapetti, cancelletto, ascensore |
| `src/model/stair.js` | Scala a spina centrale e quota di calpestio per la passeggiata |
| `src/model/kitchen.js`, `bathroom.js` | Cucina e servizi |
| `src/model/furniture.js` | Arredi attuali: il livello da sostituire nel redesign |
| `src/lib/textures.js` | Texture procedurali (mattoni, intonaco, gres, abete, parquet…) |
| `src/viewer/*` | Campiture di sezione, quote, metro, passeggiata |

Sistema di riferimento: origine nello spigolo interno nord-ovest del locale
principale; x verso est (cucina), z verso sud (finestre), y in alto. Nord e sud
sono convenzionali: il lato finestre è chiamato sud.

## Dati del rilievo e ipotesi

Misure dalle planimetrie:

| Elemento | Valore |
| --- | --- |
| Open space | 870 × 500 cm |
| Fascia servizi (bagno e ripostiglio) | 215 × 500 cm |
| Altezza libera sotto il soppalco | 307 cm |
| Soppalco: corridoio + scala | 130 + 85 cm, filo a 210–215 cm dal muro nord |
| Soppalco: tratti in pianta | 340 + 530 + 215 cm |
| Altezze sotto falda dal soppalco | 250 al muro nord, 283 al colmo, 240, 207, 170, 100 al muro sud |

La falda è stata ricostruita con una retta ai minimi quadrati sui punti
intermedi: `h = 288,6 − 0,3772 · z` (cm, sopra il soppalco), che passa per tutti
i valori entro 1 cm. Il salto a 250 cm sul muro nord è reso come trave di
banchina.

Stime da verificare in sopralluogo:

- quota del calpestio del soppalco (330 cm: 307 + 23 di struttura);
- finestre ad arco: 110 × 275 cm, davanzale a 90 cm, traversi a 180 e 275 cm;
- posizione del terzo pilastrino nell'angolo del tramezzo (visto nella foto 1);
- parapetto in mattoni della scala: prolungato fin sotto i gradini a ventaglio,
  come appare nella foto 3;
- accesso al primo gradino: le planimetrie disegnano il parapetto continuo fino
  all'ascensore, il modello lascia un varco chiuso dal cancelletto curvo;
- setto in mattoni della cucina: basso (112 cm) con un pilastrino alto accanto
  al frigorifero;
- interno del bagno e del ripostiglio (nessuna foto).

Non modellati: i canali neri dell'aria che si vedono solo nella foto 1 (nelle
altre foto non compaiono, forse è stata scattata in un altro momento).

## Prossimo passo: il redesign

Il redesign si innesta sostituendo `src/model/furniture.js` (e, se serve,
cucina, bagno e materiali in `src/lib/materials.js`) con una nuova proposta,
lasciando invariati involucro, struttura e scala.
