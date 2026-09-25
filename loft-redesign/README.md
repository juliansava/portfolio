# Loft con soppalco: rilievo 3D e redesign

Modello 3D interattivo di un loft in un edificio industriale in mattoni, su tre
livelli: ingresso al piano terra, open space e soppalco. Un interruttore passa
dallo **stato di fatto**, ricostruito da planimetrie e foto, al **progetto** di
redesign degli interni. Involucro, struttura, scale e cucina sono gli stessi
nei due scenari. Cambiano arredi, finiture leggere e servizi.

## Cosa si può fare

- **Stato di fatto / Progetto**: passa da uno scenario all'altro in qualsiasi
  vista, anche nelle piante, nelle sezioni e durante la passeggiata.
- **Assonometria** a "casa di bambola": i muri rivolti verso chi guarda e il
  tetto si nascondono da soli. Il resto del piano terra, che non fa parte del
  loft, è un volume trasparente.
- **Piante** del piano terra (taglio a −2,40 m), dell'open space (+1,40 m) e
  del soppalco (+4,50 m), con muri campiti e quote.
- **Sezione lunga** (verso nord) e **sezione corta** in asse alla finestra W2
  (verso ovest), dal piano terra al tetto, con le quote altimetriche.
- **Otto viste come nelle foto**. Le foto 1–6 sono dello stato di fatto; la 7
  è l'ingresso e la 8 l'open space vuoto visto dalla cucina (posa ricostruita
  sulla foto). In modalità Progetto le stesse inquadrature fanno da confronto
  prima/dopo.
- **Metro**: due clic sul modello danno la distanza in centimetri, con
  componenti orizzontale e verticale.
- **Clic su un elemento**: nome, misure e coordinate del punto.
- **Passeggia**: prima persona con W A S D (o i pulsanti su telefono). Dal
  portoncino si sale la scala a U, si esce dalla gabbia in ferro e si sale al
  soppalco. Parapetti, muri e arredi fermano il passo, e sotto il solaio basso
  del pianerottolo ci si china.
- Luce **giorno** o **sera** con le lampade accese dello scenario mostrato;
  ombre morbide (GTAO) disattivabili sui computer lenti.

## Il progetto

Le posizioni vengono dalle piante di progetto (pianta arredo, pianta soppalco
arredo, pianta soppalco con aggiunta), riportate alle misure del rilievo.
Restano mattoni, piastrelle, legno e ferro nero. Si aggiungono tessili, luci
calde e pochi materiali nuovi: cuoio cognac, velluto oliva, travertino, rovere
affumicato, bouclé, vetro cannettato e zellige verde.

| Zona | Progetto |
| --- | --- |
| Soggiorno | Divano in cuoio cognac contro il muro nord, tavolino ovale in travertino, due poltrone in velluto oliva, tappeto annodato, madia con giradischi e diffusori, ficus lyrata, quadro grande tra due applique |
| Pranzo | Tavolo tondo Ø 140 in rovere affumicato con sei sedie in cuoio, lampada ad arco con base in marmo |
| Bar | Mobile bar in rovere con piano in travertino, due pouf esagonali in cuoio, quadro con luce in ottone sul muro di mattoni |
| Ingresso al loft | Ulivo in vaso davanti al parapetto, sul percorso dalla gabbia |
| Cucina | Invariata |
| Servizi | Lavanderia con lavatoio e colonna lavatrice-asciugatrice, antibagno, doccia in nicchia in zellige verde con vetro fisso, bagno con wc e bidet sospesi, lavabo doppio in rovere e travertino, porte in ferro e vetro cannettato |
| Soppalco | Ampliamento del piano in vetro stratificato (148 × 97 cm, dal pilastro 2 all'ala est), parapetti che ci girano attorno, libreria a tutta parete con due poltroncine in bouclé nel corridoio, armadio a vetri cannettati tra le lesene, letto king size con comodini e applique, armadio sotto falda nell'ala est |
| Piano terra | Passatoia, panca con appendiabiti sotto la seconda rampa, consolle con specchio tondo, quadreria, ficus, grande sospensione nera |

Le pareti intonacate passano dal grigio rosato attuale a una velatura a calce
più calda.

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/index.html: un unico file, si apre anche offline
```

Parametri utili nell'indirizzo:

- `?view=` apre direttamente una vista: `planEntry`, `planGround`, `planMezz`,
  `section`, `sectionX`, `p1`…`p4`, `m1`, `m2`, `p6`, `p7`.
- `?scenario=current` parte dallo stato di fatto invece che dal progetto.

## Struttura del codice

| File | Contenuto |
| --- | --- |
| `src/survey.js` | Tutte le misure, in cm, con l'indicazione rilievo/stima/ipotesi |
| `src/model/shell.js` | Murature fino al piano terra, solaio con il vano scala, finestre ad arco, tramezzo, falda, atrio d'ingresso e caldaia |
| `src/model/structure.js` | Soppalco, pilastri, travi, parapetti (stato di fatto e progetto), ampliamento in vetro, parapetto in mattoni, gabbia d'arrivo |
| `src/model/stair.js` | Scala del soppalco, scala a U del piano terra, quote di calpestio per la passeggiata |
| `src/model/kitchen.js`, `bathroom.js` | Cucina (comune) e bagno dello stato di fatto |
| `src/model/furniture.js` | Arredi dello stato di fatto, compreso l'atrio della foto 6 |
| `src/model/project.js` | Progetto: arredi, servizi riorganizzati, soppalco, ingresso |
| `src/model/decor.js` | Pezzi comuni del progetto: piante, quadri, tappeti, tende, lampade |
| `src/lib/textures.js` | Texture procedurali (mattoni, intonaci, gres, abete, cuoio, bouclé, zellige…) |
| `src/viewer/*` | Campiture di sezione, quote, metro, passeggiata |

Sistema di riferimento: origine nello spigolo interno nord-ovest del locale
principale, a quota pavimento dell'open space; x verso est (cucina), z verso
sud (finestre), y in alto. Nord e sud sono convenzionali: il lato finestre è
chiamato sud. Il piano terra è a −3,80 m.

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
| Ampliamento in vetro (progetto) | 160 × 97 cm in pianta, 148 cm liberi tra pilastro 2 e ala est |

La falda è stata ricostruita con una retta ai minimi quadrati sui punti
intermedi: `h = 288,6 − 0,3772 · z` (cm, sopra il soppalco), che passa per tutti
i valori entro 1 cm. Il salto a 250 cm sul muro nord è reso come trave di
banchina.

Accesso e scale, dalle foto 6 e 7:

- la posa della foto 7 è stata ricostruita da cinque punti noti (pilastro,
  spigoli della gabbia, stipiti di W1). Ne risulta che il parapetto in mattoni
  corre continuo dalla gabbia fino ai gradini neri (z = 130). I due gradini
  neri occupano z 28–130: il basso x 85–125, l'alto x 0–85;
- scala del soppalco: 2 gradini a blocco, 4 a ventaglio attorno al perno
  (85, 130), rampa di 11 pedate da 23,2 cm fino al filo 340; 18 alzate da 18,3 cm;
- la gabbia in ferro nell'angolo sud-ovest è lo sbarco della scala dal piano
  terra: aperta verso il vano scala, porta sul lato est.

Stime e ipotesi da verificare:

- **piano terra**: manca la pianta. Interpiano di 380 cm (21 alzate da 18,1 cm
  contate nella foto 6), scala a U con prima rampa verso nord accanto alla
  seconda, pianerottolo sotto l'angolo nord-ovest, portoncino sul muro sud,
  caldaia nell'angolo nord-est. Con queste misure il pianerottolo ha solo
  circa 1,30 m sotto il solaio. O l'interpiano è maggiore, o il solaio sopra
  il pianerottolo è aperto: la pianta del piano terra lo chiarirà;
- quota del calpestio del soppalco (330 cm: 307 + 23 di struttura);
- finestre ad arco: 110 × 275 cm, davanzale a 90 cm, traversi a 180 e 275 cm;
- posizione del terzo pilastrino nell'angolo del tramezzo (visto nella foto 1);
- setto in mattoni della cucina: basso (112 cm) con un pilastrino alto accanto
  al frigorifero;
- interno del bagno e del ripostiglio dello stato di fatto (nessuna foto);
- nella foto 7 compare in primo piano un muretto in mattoni che non è nelle
  piante: non è nel modello.

Non modellati: i canali neri dell'aria che si vedono solo nella foto 1 (nelle
altre foto non compaiono, forse è stata scattata in un altro momento).
