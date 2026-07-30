'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'index.html');
let html = fs.readFileSync(file, 'utf8');

const oldCss = '<link rel="stylesheet" href="public-media-v1.css?v=1">';
const newCss = [
  '<link rel="stylesheet" href="public-media-v1.css?v=5">',
  '<link rel="stylesheet" href="home-gallery-full-v1.css?v=5" data-home-gallery-full-style>'
].join('\n');

const oldSection = `<section class="gallery-section" id="gallery">
  <h2 data-key="galleryTitle">MEDIA GALLERY</h2>
  <p class="section-subtitle" data-key="gallerySubtitle">Moments from camps, tournaments, training sessions and community events.</p>
  <div class="players-button-row"><a href="gallery.html" class="players-list-link" data-key="viewGallery">View Gallery →</a></div>
  <div class="gallery-grid" id="homeMediaGrid"></div>
</section>`;

const newSection = '<section class="gallery-section home-gallery-full-panel" id="gallery" aria-label="Galleria Media FIL-ITALIA"></section>';

const oldScript = '<script src="public-media-v1.js?v=1"></script>';
const newScript = [
  '<script src="public-media-v1.js?v=5"></script>',
  '<script src="home-gallery-full-v1.js?v=5" data-home-gallery-full-script></script>'
].join('\n');

html = html.replace(oldCss, newCss);
html = html.replace(oldSection, newSection);
html = html.replace(oldScript, newScript);

if (html.includes('View Gallery →') || html.includes('id="homeMediaGrid"')) {
  throw new Error('The old Home gallery cover is still present after patching.');
}
if (!html.includes('home-gallery-full-v1.js?v=5') || !html.includes('home-gallery-full-v1.css?v=5')) {
  throw new Error('The full Home gallery assets were not mounted.');
}

fs.writeFileSync(file, html, 'utf8');
console.log('Home gallery mounted directly into index.html.');
