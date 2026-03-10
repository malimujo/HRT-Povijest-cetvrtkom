const puppeteer = require('puppeteer');
const fs = require('fs');

async function updatePovijestM3U() {
let browser;
try {
console.log('🚀 Pokrećem Chrome...');

browser = await puppeteer.launch({
headless: true,
args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

console.log('📄 Učitavam https://radio.hrt.hr/slusaonica/povijest-cetvrtkom');
await page.goto('https://radio.hrt.hr/slusaonica/povijest-cetvrtkom', {
waitUntil: 'networkidle2'
});

await new Promise(r => setTimeout(r, 4000));

// 🔍 NAZIV EPIZODE + MP3
const result = await page.evaluate(() => {
const allLinks = Array.from(document.querySelectorAll('a[href], script, img'));

// 🎵 MP3 link
for (const link of allLinks) {
const href = link.href || link.src || link.getAttribute('data-src');
if (href && href.includes('api.hrt.hr/media') && href.includes('.mp3')) {
return { mp3: href, image: null };
}
}

// 🖼️ Slika
let imageUrl = null;
for (const img of allLinks) {
const src = img.src || img.getAttribute('data-src');
if (src && src.includes('api.hrt.hr/media') && (src.includes('.webp') || src.includes('.jpg'))) {
imageUrl = src;
break;
}
}

// 🎵 FIXIRANI REGEX u scriptovima
const scripts = Array.from(document.querySelectorAll('script'));
for (const script of scripts) {
const content = script.textContent || script.innerHTML;
const mp3Match1 = content.match(/"https?:\/\/api\.hrt\.hr\/media[^"]*\.mp3[^"]*"/);
const mp3Match2 = content.match(/'https?:\/\/api\.hrt\.hr\/media[^']*\.mp3[^']*'/);
if (mp3Match1) return { mp3: mp3Match1[0].slice(1, -1), image: imageUrl };
if (mp3Match2) return { mp3: mp3Match2[0].slice(1, -1), image: imageUrl };
}

return { mp3: null, image: null };
});

// 🎯 NAZIV EPIZODE IZ META TAGOVA ili H1/H2
const episodeTitle = await page.evaluate(() => {
  // Pokušaj 1: Meta title
  let title = document.querySelector('h1, h2, .episode-title, [class*="title"], [class*="naslov"]');
  if (title && title.textContent.trim()) {
    return title.textContent.trim().substring(0, 80); // Max 80 chars
  }
  
  // Pokušaj 2: Page title bez "Povijest četvrtkom"
  let pageTitle = document.title.replace(/Povijest četvrtkom/gi, '').trim();
  if (pageTitle && pageTitle.length > 10) {
    return pageTitle.substring(0, 80);
  }
  
  return 'Najnovija epizoda';
});

console.log('🎵 MP3:', result.mp3);
console.log('🖼️ Slika:', result.image);
console.log('📺 Naziv epizode:', episodeTitle);

if (result.mp3) {
const timeMatch = result.mp3.match(/(\d{4})(\d{2})(\d{2})(\d{6})\.mp3$/);
let emisijaInfo = episodeTitle;

if (timeMatch) {
const godina = timeMatch[1];
const mjesec = timeMatch[2];
const dan = timeMatch[3];
const vrijeme = timeMatch[4];
const sat = vrijeme.slice(0,2);
const minute = vrijeme.slice(2,4);
emisijaInfo = `${episodeTitle} ${dan}.${mjesec}. ${sat}:${minute}`;
}

console.log('📅 Konačni naziv:', emisijaInfo);

const imageUrl = result.image || 'https://radio.hrt.hr/favicon.ico';
const m3uContent = `#EXTM3U
#EXTINF:-1 tvg-logo="${imageUrl}" group-title="Povijest",HRT Povijest četvrtkom - ${emisijaInfo}
${result.mp3}`;

fs.writeFileSync('povijest-cetvrtkom.m3u', m3uContent);
console.log('✅ M3U spreman s pravim nazivom epizode!');
} else {
throw new Error('Nema MP3-a');
}

} catch (error) {
console.error('❌', error.message);
const fallbackContent = `#EXTM3U
#EXTINF:-1 tvg-logo="https://radio.hrt.hr/favicon.ico",HRT Povijest četvrtkom - Projekt Manhattan II. dio 11.03. 20:00
https://api.hrt.hr/media/28/da/20260311-povijest-cetvrtkom-37328740-20260311200000.mp3`;
fs.writeFileSync('povijest-cetvrtkom.m3u', fallbackContent);
console.log('✅ Fallback M3U spreman');
} finally {
if (browser) {
await browser.close();
}
}
}

updatePovijestM3U();
