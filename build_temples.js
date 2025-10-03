// build_temples.js
const fs   = require('fs');
const XLSX = require('xlsx');

/* -------------------------------------------------- */
/*  util : sérialise un objet/array en littéral JS    */
function toJsLiteral(v, indent = 0) {
  const pad = ' '.repeat(indent);

  if (Array.isArray(v))
    return '[\n' + v.map(e => pad + '  ' + toJsLiteral(e, indent + 2)).join(',\n') +
           '\n' + pad + ']';

  if (v && typeof v === 'object')
    return '{\n' +
      Object.entries(v).map(([k, val]) => {
        const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
        return pad + '  ' + key + ': ' + toJsLiteral(val, indent + 2);
      }).join(',\n') +
      '\n' + pad + '}';

  if (typeof v === 'string')
    return `'${v.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;

  return String(v);          // number, boolean, null...
}
/* -------------------------------------------------- */

(async () => {
  /* --- 1) lecture Excel -------------------------------------------------- */
  const wb     = XLSX.readFile('temples.xlsx');
  const sheet  = wb.Sheets['Feuil1'];
  const rows   = XLSX.utils.sheet_to_json(sheet, { defval: '' });  // entêtes déjà retirées

  /* --- 2) lecture de l’existant ----------------------------------------- */
  let { staticTemples } = require('./temples_static.js');

  // ► Indexation par **nom** plutôt que par id (évite l’écrasement des id=101)
  const byName = new Map(staticTemples.map(t => [t.name, t]));

  /* --- 3) merge / mise à jour ------------------------------------------- */
  rows.forEach(r => {
    const id    = +r.ID;                                    // colonne A
    const name  = r.Nom;                                    // colonne D
    const focus = String(r.Focus).toLowerCase() === 'true'; // colonne K

    if (focus) {                    // temple déjà « focus » → on met juste l’id à jour
      const existing = byName.get(name);
      if (existing) existing.id = id;
      return;
    }

    if (byName.has(name)) return;   // déjà présent → rien à faire

    // Nouveau temple à ajouter
    byName.set(name, {
      id,
      x     : +r.X,                 // colonne B
      y     : +r.Y,                 // colonne C
      name,
      type  : r.Type.trim(),        // colonne G
      bonus : r.Effet,              // colonne F
      size    : 'small',
      owner   : 0,
      contest : 'none',
      focus   : false
    });
  });

  const result = [...byName.values()]
                  .sort((a, b) => a.id - b.id);

  /* --- 4) écriture du fichier ------------------------------------------- */
  fs.writeFileSync(
    'temples_static.js',
    '// généré automatiquement par build_temples.js\n' +
    'const staticTemples = ' + toJsLiteral(result) +
    ';\n\nmodule.exports = { staticTemples };'
  );

  console.log(`✅ temples_static.js mis à jour (${result.length} entrées).`);
})().catch(console.error);
