// mark_focus.js
// -------------------------------------------------------------
//  node mark_focus.js          ← lance la mise à jour
// -------------------------------------------------------------
const XLSX              = require('xlsx');
const { staticTemples } = require('./save.js');   // ton fichier ci-dessus

/* 1) Liste des noms que l’on doit passer à true -------------------------- */
const focusNames = new Set(
  staticTemples
    .filter(t => t.focus)
    .map(t => t.name.trim().toLowerCase())        // on normalise en minuscules
);

/* 2) Ouverture du classeur ------------------------------------------------ */
const file   = 'temples.xlsx';
const wb     = XLSX.readFile(file);
const sheet  = wb.Sheets['Feuil1'];               // adapte si l’onglet porte un autre nom
const range  = XLSX.utils.decode_range(sheet['!ref']); // zone utilisée

/* 3) Parcours des lignes (on saute la 1re – l’en-tête) -------------------- */
for (let R = range.s.r + 1; R <= range.e.r; R++) {
  const nameCell = sheet[XLSX.utils.encode_cell({ c: 3, r: R })]; // colonne D (indice 3)
  if (!nameCell) continue;

  const name = String(nameCell.v).trim().toLowerCase();
  if (!focusNames.has(name)) continue;            // pas dans la liste → on ignore

  /* 4) On inscrit TRUE en colonne K (indice 10) -------------------------- */
  const focusAddr           = XLSX.utils.encode_cell({ c: 10, r: R });
  sheet[focusAddr]          = { t: 'b', v: true }; // t = boolean
}

/* 5) Sauvegarde ----------------------------------------------------------- */
XLSX.writeFile(wb, file);
console.log('✅ Colonne “Focus” mise à jour (valeur true) pour tous les temples focus.');
