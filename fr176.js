#!/usr/bin/env node
/**
 * build_grepolis_mapdata_fr175.js
 * -------------------------------
 * Génère mapData.js pour le monde fr175 (Grepolis) + temples statiques.
 * mapData = {
 *   alliances: [ { id, name, towns:[{x,y,slot}] } ],
 *   players  : [ { id, name, alliance_id, towns:[{x,y,slot}] } ],
 *   temples  : [ { id, x, y, name, bonus, type, owner } ]
 * }
 */

const http  = require('node:http');
const https = require('node:https');
const fs    = require('node:fs');
const zlib  = require('node:zlib');
const rl    = require('node:readline');
const path  = require('node:path');

/* ---- temples définis manuellement ---- */
const { staticTemples } = require('./temples_static.js');   // créez / complétez ce fichier

const WORLD = 'fr176';
const BASE  = `http://${WORLD}.grepolis.com/data`;
const FILES = {
  players   : 'players.txt.gz',
  alliances : 'alliances.txt.gz',
  towns     : 'towns.txt.gz',
};

/* ---------- helpers ---------- */
const clean = s => s.replace(/\+/g, ' ');

function download (url) {
  return new Promise((resolve, reject) => {
    (url.startsWith('https') ? https : http).get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return download(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}`));
      else resolve(res);
    }).on('error', reject);
  });
}

function loadCsv (file, parser) {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = (await download(`${BASE}/${file}`)).pipe(zlib.createGunzip());
      const out = [];
      rl.createInterface({ input: stream })
        .on('line', l => out.push(parser(l.split(',').map(decodeURIComponent))))
        .on('close', () => resolve(out))
        .on('error', reject);
    } catch (e) { reject(e); }
  });
}

/* ---------- parsers ---------- */
const parsePlayers   = ([id, name, aid])        => ({ id:+id, name:clean(name), alliance_id:+aid, towns:[] });
const parseAlliances = ([id, name])             => ({ id:+id, name:clean(name), towns:[] });
const parseTowns     = ([, pid,, x, y, slot])   => ({ player_id:+pid, x:+x, y:+y, slot:+slot });

/* ---------- main ---------- */
(async () => {
  const [players, alliances, towns] = await Promise.all([
    loadCsv(FILES.players,   parsePlayers),
    loadCsv(FILES.alliances, parseAlliances),
    loadCsv(FILES.towns,     parseTowns),
  ]);

  const pById = Object.fromEntries(players.map(p => [p.id, p]));
  const aById = Object.fromEntries(alliances.map(a => [a.id, a]));

  towns.forEach(t => {
    const p = pById[t.player_id];
    if (!p) return;
    p.towns.push({ x:t.x, y:t.y, slot:t.slot });

    if (!aById[p.alliance_id])
      aById[p.alliance_id] = { id:p.alliance_id, name:`Alliance ${p.alliance_id}`, towns:[] };

    aById[p.alliance_id].towns.push({ x:t.x, y:t.y, slot:t.slot });
  });

  const mapData = {
    alliances: Object.values(aById),
    players  : players,
    temples  : staticTemples        // <── temples injectés
  };

  fs.writeFileSync(
    path.join(__dirname, 'mapData.js'),
    `// généré le ${new Date().toISOString()}\nconst mapData = ${JSON.stringify(mapData, null, 2)};`
  );

  console.log(`✅ mapData.js : ${mapData.temples.length} temples, ${mapData.alliances.length} alliances, ${mapData.players.length} joueurs.`);
})().catch(err => { console.error(err); process.exit(1); });
