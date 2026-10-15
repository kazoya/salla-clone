// node gen-svg.js <seed-data.js> <outDir>  -> one SVG per item (gradient + geometric motif + English label)
const fs = require('fs'); const [, , seedFile, out] = process.argv; const seed = require(seedFile);
fs.mkdirSync(out, { recursive: true });
const items = seed.stores ? seed.stores.flatMap(s => s.products.map(p => [p[0], p[2]])) : seed.ads.map(a => [a[0], a[4]]);
const palettes = [['#0f766e','#134e4a','#5eead4'],['#c2410c','#7c2d12','#fdba74'],['#4338ca','#1e1b4b','#a5b4fc'],['#be185d','#500724','#f9a8d4'],['#a16207','#422006','#fde68a'],['#0369a1','#082f49','#7dd3fc'],['#15803d','#052e16','#86efac'],['#7e22ce','#3b0764','#d8b4fe']];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
items.forEach(([slug, label], i) => {
  const [a, b, c] = palettes[i % palettes.length]; const r = 60 + (i * 37) % 70;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${esc(label)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="800" height="600" fill="url(#g)"/>
<circle cx="${560 + (i % 3) * 40}" cy="${170 + (i % 4) * 20}" r="${r + 90}" fill="${c}" opacity=".18"/>
<circle cx="${220 - (i % 2) * 40}" cy="420" r="${r + 30}" fill="${c}" opacity=".12"/>
<rect x="300" y="170" width="200" height="200" rx="${(i % 3) * 50 + 24}" fill="none" stroke="${c}" stroke-width="10" opacity=".85" transform="rotate(${(i * 15) % 45} 400 270)"/>
<text x="400" y="520" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="700" fill="#fff">${esc(label)}</text>
</svg>`;
  fs.writeFileSync(`${out}/${slug}.svg`, svg);
});
console.log(items.length, 'svgs ->', out);
