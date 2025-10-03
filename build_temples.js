// build_temples.js
const fs   = require('fs');
const XLSX = require('xlsx');

/* --------------------- sérialisation JS jolie -------------------------- */
function toJsLiteral(v, indent = 0) {
  const pad = ' '.repeat(indent);

  if (Array.isArray(v)) {
    return '[\n' +
      v.map(e => pad + '  ' + toJsLiteral(e, indent + 2)).join(',\n') +
      '\n' + pad + ']';
  }
  if (v && typeof v === 'object') {
    return '{\n' +
      Object.entries(v).map(([k, val]) => {
        const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
        return pad + '  ' + key + ': ' + toJsLiteral(val, indent + 2);
      }).join(',\n') +
      '\n' + pad + '}';
  }
  if (typeof v === 'string') {
    return `'${v.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
  }
  return String(v); // number, boolean, null…
}
/* ---------------------------------------------------------------------- */

(() => {
  /* ---- 1) lecture du classeur Excel ---------------------------------- */
  const wb    = XLSX.readFile('temples.xlsx');
  const sheet = wb.Sheets['Feuil1'];
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' }); // déjà avec entêtes

  /* ---- 2) conversion → objets “temple” ------------------------------- */
  const temples = rows.map(r => ({
    id     : +r.ID,                   // A
    x      : +r.X,                    // B
    y      : +r.Y,                    // C
    name   : r.Nom,                   // D
    type   : (r.Type || '').trim(),   // G
    bonus  : r.Effet,                 // F
    size    : 'small',
    owner   : 0,
    contest : 'none',
    focus   : String(r.Focus).toLowerCase() === 'true' // K
  }));

  /* ---- 3) tri (facultatif) ------------------------------------------- */
  temples.sort((a, b) => a.id - b.id);

  /* ---- 4) écriture du fichier JS ------------------------------------- */
  fs.writeFileSync(
    'temples_static.js',
    '// généré automatiquement par build_temples.js\n' +
    'const staticTemples = ' + toJsLiteral(temples, 0) + ';\n\n' +
    'module.exports = { staticTemples };'
  );

  console.log(`✅ temples_static.js généré (${temples.length} entrées).`);
})();
