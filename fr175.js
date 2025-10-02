#!/usr/bin/env node
/**
 * Génère mapData.js (fr176) + temples statiques.
 */

const http  = require('node:http');
const https = require('node:https');
const fs    = require('node:fs');
const zlib  = require('node:zlib');
const rl    = require('node:readline');
const path  = require('node:path');

/* ---- temples définis à la main ---- */
const { staticTemples } = require('./temples_static.js');  // <-- ICI

const WORLD='fr176';
const BASE =`http://${WORLD}.grepolis.com/data`;
const FILES={players:'players.txt.gz',alliances:'alliances.txt.gz',towns:'towns.txt.gz'};

/* helpers */
const clean=s=>s.replace(/\+/g,' ');
const download=u=>new Promise((ok,ko)=>{
  (u.startsWith('https')?https:http).get(u,r=>{
    if(r.statusCode>=300&&r.statusCode<400&&r.headers.location) return download(r.headers.location).then(ok).catch(ko);
    if(r.statusCode!==200) return ko(new Error(`HTTP ${r.statusCode}`));
    ok(r);
  }).on('error',ko);
});
const loadCsv=(f,p)=>new Promise(async(ok,ko)=>{
  try{
    const st=(await download(`${BASE}/${f}`)).pipe(zlib.createGunzip());
    const out=[];rl.createInterface({input:st}).on('line',l=>out.push(p(l.split(',').map(decodeURIComponent)))).on('close',()=>ok(out));
  }catch(e){ko(e);}
});

/* parsers */
const parsePlayers   =([id,n,aid])         =>({id:+id,name:clean(n),alliance_id:+aid,towns:[]});
const parseAlliances= ([id,n])             =>({id:+id,name:clean(n),towns:[]});
const parseTowns     =([,pid,,x,y,slot])   =>({player_id:+pid,x:+x,y:+y,slot:+slot});

/* main */
(async()=>{
  const [players,alliances,towns]=await Promise.all([
    loadCsv(FILES.players,   parsePlayers),
    loadCsv(FILES.alliances, parseAlliances),
    loadCsv(FILES.towns,     parseTowns)
  ]);

  const pById=Object.fromEntries(players.map(p=>[p.id,p]));
  const aById=Object.fromEntries(alliances.map(a=>[a.id,a]));

  towns.forEach(t=>{
    const p=pById[t.player_id]; if(!p) return;
    p.towns.push({x:t.x,y:t.y,slot:t.slot});
    if(!aById[p.alliance_id]) aById[p.alliance_id]={id:p.alliance_id,name:`Alliance ${p.alliance_id}`,towns:[]};
    aById[p.alliance_id].towns.push({x:t.x,y:t.y,slot:t.slot});
  });

  const mapData={
    alliances:Object.values(aById),
    players,
    temples: staticTemples          // <-- injection
  };

  fs.writeFileSync(
    path.join(__dirname,'mapData.js'),
    `// généré le ${new Date().toISOString()}\nconst mapData = ${JSON.stringify(mapData,null,2)};`
  );
  console.log(`✅ mapData.js : ${mapData.temples.length} temples, ${mapData.alliances.length} alliances, ${mapData.players.length} joueurs`);
})();
