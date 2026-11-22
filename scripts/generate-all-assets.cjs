const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Ícone principal (Favicon, Header, PWA, Android Launcher)
 * Emblema Ψ (Psicologia) + Monograma geométrico MF em degradê teal clínico e dourado
 */
function getIconSvg({ size = 512, rounded = 116, isForeground = false, maskable = false }) {
  const scale = maskable ? 0.78 : (isForeground ? 0.72 : 1);
  const offset = (512 * (1 - scale)) / 2;
  const showBg = !isForeground;

  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tealBg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="60%" stop-color="#115e59" />
      <stop offset="100%" stop-color="#042f2e" />
    </linearGradient>
    <linearGradient id="mintArc" x1="140" y1="150" x2="372" y2="300" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#99f6e4" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#99f6e4" />
    </linearGradient>
  </defs>

  ${showBg ? `<rect width="512" height="512" ${maskable ? '' : `rx="${rounded}"`} fill="url(#tealBg)" />` : ''}

  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <!-- Anel sutil de equilíbrio -->
    <circle cx="256" cy="248" r="190" stroke="#5eead4" stroke-width="4" stroke-opacity="0.28" fill="none" />

    <!-- Esfera superior de clareza / acolhimento -->
    <circle cx="256" cy="96" r="20" fill="#fbbf24" />

    <!-- Símbolo Ψ (Psicologia) -->
    <path d="M 256 134 L 256 322" stroke="#FFFFFF" stroke-width="28" stroke-linecap="round" />
    <path d="M 150 156 C 146 254, 198 286, 256 286 C 314 286, 366 254, 362 156"
          stroke="url(#mintArc)" stroke-width="26" stroke-linecap="round" fill="none" />
    <path d="M 222 326 L 290 326" stroke="#5eead4" stroke-width="14" stroke-linecap="round" />

    <!-- Monograma Geométrico MF (Marlon Figueiredo) -->
    <path d="M 179 434 L 179 370 L 211 412 L 243 370 L 243 434"
          stroke="#FFFFFF" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="263" cy="402" r="6.5" fill="#fbbf24" />
    <path d="M 285 434 L 285 370 L 333 370 M 285 402 L 323 402"
          stroke="#99f6e4" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>
</svg>`;
}

/**
 * Logo completo com nome (public/logo.svg e Splash Screens Android)
 */
function getLogoSvg({ size = 512, background = '#FFFFFF' }) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tealEmblem" x1="150" y1="80" x2="362" y2="310" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#134e4a" />
    </linearGradient>
  </defs>

  ${background ? `<rect width="512" height="512" fill="${background}" />` : ''}

  <!-- Emblema Superior -->
  <circle cx="256" cy="186" r="126" fill="#f0fdfa" stroke="#99f6e4" stroke-width="4" />
  <circle cx="256" cy="96" r="14" fill="#d97706" />
  <path d="M 256 124 L 256 268" stroke="#0f766e" stroke-width="20" stroke-linecap="round" />
  <path d="M 176 142 C 174 216, 212 242, 256 242 C 300 242, 338 216, 336 142"
        stroke="url(#tealEmblem)" stroke-width="18" stroke-linecap="round" fill="none" />
  <path d="M 230 272 L 282 272" stroke="#14b8a6" stroke-width="10" stroke-linecap="round" />

  <!-- Tipografia Oficial -->
  <text x="256" y="372" text-anchor="middle"
        font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-weight="700" font-size="33" fill="#18181b" letter-spacing="3.5">MARLON FIGUEIREDO</text>

  <line x1="136" y1="394" x2="376" y2="394" stroke="#99f6e4" stroke-width="2.5" stroke-linecap="round" />

  <text x="256" y="428" text-anchor="middle"
        font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-weight="600" font-size="19" fill="#0f766e" letter-spacing="4.5">PSICOLOGIA CLÍNICA</text>
</svg>`;
}

async function renderPng(svgString, width, height, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toFile(outputPath);
}

async function renderSplash(width, height, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const isPortrait = height >= width;
  const logoTargetDim = isPortrait
    ? Math.round(width * 0.72)
    : Math.round(height * 0.72);

  const logoSvg = getLogoSvg({ size: logoTargetDim, background: null });
  const logoBuf = await sharp(Buffer.from(logoSvg))
    .resize(logoTargetDim, logoTargetDim)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toFile(outputPath);
}

async function main() {
  console.log('Generating all Marlon Figueiredo brand assets...');

  // 1. Vector SVGs in public/
  fs.writeFileSync('public/icon.svg', getIconSvg({ size: 512, rounded: 116 }));
  fs.writeFileSync('public/logo.svg', getLogoSvg({ size: 512, background: '#FFFFFF' }));
  console.log('✔ Generated public/icon.svg and public/logo.svg');

  // 2. Favicons & Web / PWA icons
  await renderPng(getIconSvg({ size: 64, rounded: 14 }), 64, 64, 'public/favicon.png');
  await renderPng(getIconSvg({ size: 32, rounded: 7 }), 32, 32, 'public/favicon.ico');
  await renderPng(getIconSvg({ size: 180, rounded: 38 }), 180, 180, 'public/apple-touch-icon.png');
  await renderPng(getIconSvg({ size: 192, rounded: 44 }), 192, 192, 'public/pwa-192x192.png');
  await renderPng(getIconSvg({ size: 512, rounded: 116 }), 512, 512, 'public/pwa-512x512.png');
  await renderPng(getIconSvg({ size: 512, maskable: true }), 512, 512, 'public/pwa-maskable-512x512.png');
  console.log('✔ Generated web and PWA icons in public/');

  // 3. Android mipmaps
  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];

  for (const m of mipmaps) {
    const baseDir = path.join('android/app/src/main/res', m.dir);
    await renderPng(getIconSvg({ size: m.size, rounded: Math.round(m.size * 0.22) }), m.size, m.size, path.join(baseDir, 'ic_launcher.png'));
    await renderPng(getIconSvg({ size: m.size, rounded: Math.round(m.size / 2) }), m.size, m.size, path.join(baseDir, 'ic_launcher_round.png'));
    await renderPng(getIconSvg({ size: m.fgSize, isForeground: true }), m.fgSize, m.fgSize, path.join(baseDir, 'ic_launcher_foreground.png'));
    console.log(`✔ Generated Android icons for ${m.dir}`);
  }

  // 4. Android splash screens
  const splashes = [
    { path: 'android/app/src/main/res/drawable/splash.png', w: 480, h: 320 },
    { path: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480 },
    { path: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800 },
    { path: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280 },
    { path: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600 },
    { path: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920 },
    { path: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320 },
    { path: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480 },
    { path: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720 },
    { path: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960 },
    { path: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280 }
  ];

  for (const s of splashes) {
    await renderSplash(s.w, s.h, s.path);
    console.log(`✔ Generated splash for ${s.path} (${s.w}x${s.h})`);
  }

  console.log('All Marlon Figueiredo assets successfully generated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
