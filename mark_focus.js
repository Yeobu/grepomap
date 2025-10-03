// mark_focus.js
// -----------------------------------------------------------------
//  node mark_focus.js
// -----------------------------------------------------------------
const XLSX              = require('xlsx');
const { staticTemples } = require('./save.js');   // ta liste focus:true

/* util : nom canonique sans accents ------------------------------------ */
function canon (s){
  return String(s)
          .normalize('NFD')          // é → e + ́  ,  ê → e + ̂  ,  …
          .replace(/\p{M}/gu, '')    // supprime tout diacritique
          .trim()
          .toLowerCase();
}

/* 1) Noms des temples à marquer ---------------------------------------- */
const focusNames = new Set(
  staticTemples.filter(t => t.focus).map(t => canon(t.name))
);

/* 2) Lecture du classeur ------------------------------------------------ */
const FILE   = 'temples.xlsx';
const wb     = XLSX.readFile(FILE);
const sheet  = wb.Sheets['Feuil1'];               // adapte l’onglet si besoin
const range  = XLSX.utils.decode_range(sheet['!ref']); // zone utilisée

/* 3) Balayage des lignes ------------------------------------------------ */
for (let R = range.s.r + 1; R <= range.e.r; R++) {     // saute l’en-tête
  const nameAddr  = XLSX.utils.encode_cell({ c: 3,  r: R }); // col. D
  const focusAddr = XLSX.utils.encode_cell({ c: 10, r: R }); // col. K
  const cell      = sheet[nameAddr];
  if (!cell) continue;                               // pas de nom ⇒ ignore

  const isFocus = focusNames.has( canon(cell.v) );

  /* on (re)met la cellule comme texte ---------------------------------- */
  sheet[focusAddr] = { t: 's', v: isFocus ? 'true' : '' };
}

/* 4) Sauvegarde --------------------------------------------------------- */
XLSX.writeFile(wb, FILE);
console.log('✅ Colonne K mise à jour : true/blank selon focus (accents ignorés).');
