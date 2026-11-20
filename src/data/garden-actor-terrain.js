/** Coordinates in the existing background image plane (not the viewport).
 * These open foreground surfaces have no foreground mask over the walking area.
 * Entries describe real edges only; they do not create game visits/departures. */
export const GARDEN_ACTOR_TERRAIN = Object.freeze({
  'java-rice': {
    surface:[[.16,.62],[.84,.62],[.84,.87],[.16,.87]],
    rows:[.68,.76,.84], columns:[.23,.36,.5,.64,.77],
    denseRows:[.66,.72,.78,.84],
    entries:[[.16,.72],[.84,.72]], height: .065, preferred:'look',
    note:'門柱より手前の石畳。植え込みと両端の芝を避ける。',
  },
  'bird-diamond-firetail': {
    surface:[[.28,.46],[.76,.46],[.73,.77],[.31,.77]],
    rows:[.55,.65,.75], columns:[.34,.42,.5,.58,.66],
    denseRows:[.53,.59,.65,.71,.77],
    entries:[[.28,.61],[.74,.61]], height:.06, preferred:'peck',
    note:'石垣の手前の低い芝。左右と下端の白花には着地しない。',
  },
  hanadokei: {
    surface:[[.40,.565],[.82,.57],[.83,.72],[.65,.82],[.32,.82],[.19,.72],[.25,.62]],
    rows:[.63,.70,.77], columns:[.28,.39,.5,.61,.72],
    denseRows:[.63,.68,.73,.78],
    entries:[[.23,.69],[.8,.69]], height:.065, preferred:'preen',
    note:'温室前の平らな石畳。奥の段差・鉢・花壇と前景の花を避ける。',
  },
  komorebi: {
    surface:[[.30,.48],[.70,.48],[.80,.68],[.70,.82],[.30,.82],[.20,.68]],
    rows:[.57,.67,.77],columns:[.28,.39,.50,.61,.72],denseRows:[.54,.60,.66,.72,.78],
    entries:[[.25,.68],[.75,.68]],height:.06,
    note:'二本の幹の間の芝。奥の根と石列、手前の葉の茂みを除く。',
  },
  'bird-white-headed-munia': {
    surface:[[.38,.58],[.62,.58],[.82,.69],[.76,.85],[.24,.85],[.18,.69]],
    rows:[.65,.74,.83],columns:[.28,.39,.50,.61,.72],denseRows:[.63,.69,.75,.81,.85],
    entries:[[.24,.72],[.76,.72]],height:.065,
    note:'穂の列の手前の土。奥の細道と左右の草、手前の花を避ける。',
  },
  'bird-scaly-breasted-munia': {
    surface:[[.20,.51],[.80,.51],[.83,.75],[.74,.84],[.26,.84],[.17,.75]],
    rows:[.60,.70,.80],columns:[.24,.37,.50,.63,.76],denseRows:[.56,.62,.68,.74,.80],
    entries:[[.22,.66],[.78,.66]],height:.055,
    note:'横長の原画の平たい石畳。遠景の穂と手前の草を除外。',
  },
  'bird-red-crossbill': {
    surface:[[.29,.48],[.72,.48],[.80,.69],[.69,.85],[.30,.85],[.23,.67]],
    rows:[.59,.70,.80],columns:[.29,.40,.51,.62,.73],denseRows:[.56,.62,.68,.74,.80],
    entries:[[.27,.66],[.76,.66]],height:.06,
    note:'松の幹の間の土道。左の根、右の松ぼっくりとシダを避ける。',
  },
  'bird-japanese-grosbeak': {
    surface:[[.30,.54],[.70,.54],[.77,.68],[.68,.80],[.30,.80],[.23,.68]],
    rows:[.60,.68,.76],columns:[.28,.39,.50,.61,.72],denseRows:[.56,.62,.68,.74,.79],
    entries:[[.26,.65],[.74,.65]],height:.06,
    note:'木立の手前の低い芝。両端の根と手前のシダ、白い花を除く。',
  },
  'shrine-grove': {
    surface:[[.27,.52],[.75,.52],[.83,.69],[.71,.84],[.31,.84],[.20,.68]],
    rows:[.60,.70,.80],columns:[.28,.39,.50,.61,.72],denseRows:[.56,.62,.68,.74,.80],
    entries:[[.24,.67],[.77,.67]],height:.065,
    note:'落ち葉の山に囲まれた土の中央。幹と手前両側の葉だまりに入らない。',
  },
  'bird-common-redpoll': {
    surface:[[.26,.59],[.66,.59],[.78,.70],[.69,.85],[.30,.85],[.21,.70]],
    rows:[.65,.73,.81],columns:[.27,.38,.49,.60,.71],denseRows:[.62,.68,.74,.80,.84],
    entries:[[.25,.70],[.74,.72]],height:.06,
    note:'白樺より手前の明るい土道。右の赤い実と幹、下端の草を避ける。',
  },
  tsukiakari: {
    surface:[[.22,.59],[.78,.59],[.81,.76],[.74,.86],[.26,.86],[.19,.76]],
    rows:[.65,.74,.83],columns:[.26,.38,.50,.62,.74],denseRows:[.62,.68,.74,.80,.85],
    entries:[[.23,.71],[.77,.71]],height:.06,
    note:'山並みより手前の平らなひろば。奥の枯れ草と岩、手前の花穂を避ける。',
  },

});
export const actorTerrainFor = id => GARDEN_ACTOR_TERRAIN[id] || null;
