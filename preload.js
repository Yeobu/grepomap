// preload.js  (à la racine MAP/)
async function preload(srcList){
    const cache = {};
    await Promise.all(srcList.map(src => new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { cache[src] = img; resolve(); };
      img.onerror = () => {
        console.warn('🟠 img failed', src);          // log mais on continue
        resolve();                                   // on NE rejette PAS
      };
      img.src = src;
    })));
    return cache;            // images chargées (ou manquantes) sans casse
  }