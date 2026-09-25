// Dati di rilievo del loft, in centimetri.
//
// Sistema di riferimento: origine nello spigolo interno nord-ovest del locale
// principale, a quota pavimento. x cresce verso est (verso la cucina),
// z verso sud (verso le finestre), y verso l'alto.
// "Nord" e "sud" sono convenzionali: il lato finestre è chiamato sud.
//
// Le quote marcate "rilievo" vengono dalle planimetrie; quelle marcate
// "stima" sono ricavate dalle foto o dalla proporzione del disegno e vanno
// verificate in sopralluogo.

export const S = {
  // --- Involucro -------------------------------------------------------
  mainLength: 870, // rilievo: locale open space, da parete ovest al tramezzo
  depth: 500, // rilievo: profondità interna (510 al soppalco, muro più sottile)
  partitionT: 12, // stima: tramezzo tra open space e servizi
  rightWidth: 215, // rilievo: fascia servizi (bagno + ripostiglio)
  wallT: 45, // stima: muratura perimetrale in mattoni pieni

  // --- Quote verticali -------------------------------------------------
  mezzUnder: 307, // rilievo: "Altezza = 307" sotto il soppalco
  mezzTop: 330, // stima: estradosso soppalco (travi IPE 220 + parquet)
  // Falda unica in legno: altezze sopra il pavimento del soppalco
  // rilievo: 250 a filo muro nord, 283 al colmo, 240 a 130 cm,
  // 207 al filo soppalco (210 cm), 170 a ~316 cm, 100 al muro sud.
  // Una retta ai minimi quadrati sui punti intermedi dà
  // h(z) = 288,6 - 0,3772·z: passa per tutti entro 1 cm.
  roofAtNorth: 330 + 288.6,
  roofAtSouth: 330 + 100,
  northPlateBottom: 330 + 250, // trave di banchina sul muro nord
  northPlateDepth: 20,

  // --- Soppalco ----------------------------------------------------------
  mezzEdgeZ: 212, // rilievo: 210 cm (130 corridoio + 85 scala ≈ 215)
  corridorW: 130, // rilievo: corridoio a nord della scala
  stairOpeningEndX: 340, // rilievo: "340" dalla parete ovest

  // --- Struttura in acciaio ------------------------------------------------
  columns: [
    { x: 345, z: 212, d: 14 }, // rilievo (pallino in pianta)
    { x: 722, z: 212, d: 14 }, // rilievo
    { x: 862, z: 212, d: 11 }, // stima: pilastrino nell'angolo del tramezzo (foto 1)
  ],
  beamH: 22, // IPE 220

  // --- Scala a spina centrale ---------------------------------------------
  stair: {
    width: 85, // rilievo
    risers: 18, // 18 alzate da 18,3 cm
    lowerFlightStartZ: 389, // stima: primo gradino accanto all'ascensore
  },

  // --- Parapetto in mattoni e cancelletto ----------------------------------
  // Il rilievo disegna il parapetto fino all'ascensore; qui si lascia il varco
  // chiuso dal cancelletto curvo (foto 3 e 4), unico accesso plausibile alla scala.
  // Verso nord prosegue sotto i gradini a ventaglio: nella foto 3 la testata
  // compare subito dietro il pilastro.
  parapet: { x: 85, t: 12, z0: 185, z1: 325, h: 115 },

  // --- Ascensore (angolo sud-ovest) ----------------------------------------
  lift: { x0: 0, x1: 97, z0: 389, z1: 500, h: 245 },

  // --- Aperture ------------------------------------------------------------
  // Finestre ad arco a tutto sesto, telaio in ferro nero.
  windows: [
    // Dalla foto 3: davanzale ~90 cm, chiave dell'arco ~365 cm, traversi a ~180 e ~275.
    { id: 'W1', x0: 170, x1: 280, sill: 90, crown: 365 },
    { id: 'W2', x0: 520, x1: 630, sill: 90, crown: 365 },
    { id: 'W3', x0: 905, x1: 1015, sill: 90, crown: 285 }, // bagno, sotto il soppalco: stima
  ],
  // Lesene intonacate sul muro sud, in asse con i pilastri.
  southPilasters: [345, 722],
  southPilasterW: 50,

  // Tramezzo: porta verso il bagno.
  bathDoor: { z0: 105, z1: 190, h: 210 }, // rilievo (proporzionale)
  // Muro interno della fascia servizi (divide ripostiglio e bagno).
  serviceWallZ: 105,

  // Cassonetto / canna fumaria sul muro nord (piano principale).
  chimney: { x0: 185, x1: 271, depth: 28 },
  // Lesene sul muro nord al livello del soppalco (pianta soppalco).
  northPilasters: [
    { x0: 340, x1: 366, depth: 50 },
    { x0: 702, x1: 730, depth: 50 },
  ],

  // Setto in mattoni che chiude la cucina verso ovest.
  // Dalla foto 2: tra piano e frigo restano ~45 cm di muro vecchio.
  kitchenStub: { x: 688, t: 25, z0: 383, z1: 500 },
};

// Lunghezza interna totale (open space + tramezzo + servizi).
S.totalLength = S.mainLength + S.partitionT + S.rightWidth;
S.rightX0 = S.mainLength + S.partitionT;
S.rightX1 = S.totalLength;

// Altezza dell'intradosso del tavolato alla coordinata z (cm).
export function roofY(z) {
  const t = z / S.depth;
  return S.roofAtNorth + (S.roofAtSouth - S.roofAtNorth) * t;
}

// Altezza del gradino i (1..risers-1) e del piano di arrivo.
export function riserH() {
  return (S.mezzTop) / S.stair.risers;
}

export const cm = (v) => v / 100;
