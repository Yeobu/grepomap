#!/usr/bin/env node
/**
 * build_grepolis_mapdata.js
 * -------------------------
 * Génère mapData.js pour le monde fr176.
 * Contenu exporté :
 *   const mapData = {
 *     alliances: [ { id, name, towns:[{x,y},…] }, … ],
 *     players  : [ { id, name, alliance_id, towns:[{x,y},…] }, … ]
 *   };
 */

const http  = require('node:http');
const https = require('node:https');
const fs    = require('node:fs');
const zlib  = require('node:zlib');
const rl    = require('node:readline');
const path  = require('node:path');

const WORLD = 'fr176';
const BASE  = `http://${WORLD}.grepolis.com/data`;
const FILES = {
  players   : 'players.txt.gz',
  alliances : 'alliances.txt.gz',
  towns     : 'towns.txt.gz',
};
const { staticTemples } = require('./temples_static.js');

/* ───────────────────────── helpers ───────────────────────── */
const clean = s => s.replace(/\+/g, ' ');

function download (url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200)
        return reject(new Error(`HTTP ${res.statusCode}`));
      resolve(res);
    }).on('error', reject);
  });
}

function loadCsv (file, parser) {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = (await download(`${BASE}/${file}`)).pipe(zlib.createGunzip());
      const rlif   = rl.createInterface({ input: stream });
      const out    = [];
      rlif.on('line', l => out.push(parser(l.split(',').map(decodeURIComponent))));
      rlif.on('close', () => resolve(out));
      rlif.on('error', reject);
    } catch (e) { reject(e); }
  });
}

/* ───────────────────────── parsers ───────────────────────── */
const parsePlayers   = ([id, name, aid])        => ({ id:+id, name:clean(name), alliance_id:+aid, towns:[] });
const parseAlliances = ([id, name])             => ({ id:+id, name:clean(name), towns:[] });
const parseTowns     = ([, pid, , x, y])        => ({ player_id:+pid, x:+x, y:+y });

/* ───────────────────────── main ───────────────────────── */
(async () => {
  const [players, alliances, towns] = await Promise.all([
    loadCsv(FILES.players,   parsePlayers),
    loadCsv(FILES.alliances, parseAlliances),
    loadCsv(FILES.towns,     parseTowns),
  ]);

  const playersById   = Object.fromEntries(players.map(p => [p.id, p]));
  const alliancesById = Object.fromEntries(alliances.map(a => [a.id, a]));

  for (const { player_id, x, y } of towns) {
    const p = playersById[player_id];
    if (!p) continue;
    p.towns.push({ x, y });

    const aid = p.alliance_id;
    if (!alliancesById[aid]) {
      alliancesById[aid] = { id: aid, name: `Alliance ${aid}`, towns: [] };
    }
    alliancesById[aid].towns.push({ x, y });
  }

  const mapData = {
    alliances: Object.values(alliancesById),
    players  : players,
    temples   : staticTemples
  };

  fs.writeFileSync(
    path.join(__dirname, 'mapData.js'),
    `// généré le ${new Date().toISOString()}\nconst mapData = ${JSON.stringify(mapData, null, 2)};`
  );

  console.log(`✅ mapData.js écrit : ${mapData.alliances.length} alliances, ${mapData.players.length} joueurs.`);
})().catch(err => { console.error(err); process.exit(1); });
