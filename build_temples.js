// build_temples.js
const fs   = require('fs');
const XLSX = require('xlsx');

/* -------------------------------------------------- */
/*  util : sérialise un objet/array en littéral JS    */
function toJsLiteral(v, indent = 0) {
  const pad = ' '.repeat(indent);

  // Tableau
  if (Array.isArray(v)) {
    return '[\n' +
      v.map(e => pad + '  ' + toJsLiteral(e, indent + 2)).join(',\n') +
      '\n' + pad + ']';
  }

  // Objet
  if (v && typeof v === 'object') {
    return '{\n' +
      Object.entries(v).map(([k, val]) => {
        const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
        return pad + '  ' + key + ': ' + toJsLiteral(val, indent + 2);
      }).join(',\n') +
      '\n' + pad + '}';
  }

  // Chaîne
  if (typeof v === 'string') {
    return `'${v.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
  }

  // number, boolean, null
  return String(v);
}
/* -------------------------------------------------- */

// IIFE asynchrone
(async () => {
  /* --- 1) lecture Excel -------------------------------------------------- */
  const wb     = XLSX.readFile('temples.xlsx');
  const sheet  = wb.Sheets['Feuil1'];
  const rows   = XLSX.utils.sheet_to_json(sheet, {defval:''});  // tableau d’objets

  /* --- 2) lecture de l’existant ----------------------------------------- */
  let { staticTemples } = require('./temples_static.js');
  const byId = new Map(staticTemples.map(t => [t.id, t]));      // accès rapide

  /* --- 3) merge / mise à jour ------------------------------------------- */
  rows.slice(1).forEach(r => {          // on saute la ligne d’entête
    const id    = +r.ID;
    const focus = String(r['Focus']).toLowerCase() === 'true';

    // Si focus → déjà dans la base, on met juste l'id à jour (au cas où)
    if (focus) {
      if (byId.has(id)) byId.get(id).id = id;
      return;
    }

    if (byId.has(id)) return;           // déjà présent → rien à faire

    // Temple manquant : on l’ajoute
    byId.set(id, {
      id,
      x     : +r.X,
      y     : +r.Y,
      name  : r.Nom,
      type  : r.Type.trim(),
      bonus : r.Effet,
      size    : 'small',
      owner   : 0,
      contest : 'none',
      focus   : false
    });
  });

  const result = [...byId.values()].sort((a,b) => a.id - b.id);

  /* --- 4) écriture du fichier ------------------------------------------- */
  fs.writeFileSync(
    'temples_static.js',
    '// généré automatiquement par build_temples.js\n'
    + 'const staticTemples = '
    + toJsLiteral(result, 0)
    + ';\n\nmodule.exports = { staticTemples };'
  );

  console.log(`✅ temples_static.js mis à jour (${result.length} entrées).`);
})().catch(console.error);
