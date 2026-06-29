const fs = require("fs");

const SITE_URL = "https://www.filitalianationselect.com";

function escXml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getHtmlFiles(dir = "."){
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for(const item of items){
    const fullPath = dir === "." ? item.name : `${dir}/${item.name}`;

    if(item.isDirectory()){
      if(["node_modules", ".git"].includes(item.name)) continue;
      results.push(...getHtmlFiles(fullPath));
    }

    if(item.isFile() && item.name.endsWith(".html")){
      results.push(fullPath);
    }
  }

  return results;
}

function generateSitemap(){
  const files = getHtmlFiles();

  const urls = files
    .map(file => {
      const cleanPath = file === "index.html" ? "" : file;
      return `${SITE_URL}/${cleanPath}`;
    })
    .sort();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${escXml(url)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url.endsWith("/") ? "1.0" : "0.8"}</priority>
  </url>`).join("\n")}
</urlset>
`;

  fs.writeFileSync("sitemap.xml", xml);
  console.log(`✅ sitemap.xml generata con ${urls.length} URL`);
}

generateSitemap();