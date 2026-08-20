(function () {
  "use strict";

  function currentLanguage() {
    try {
      const value = String(localStorage.getItem("language") || document.documentElement.lang || "it").toLowerCase();
      return ["it", "en", "ph"].includes(value) ? value : "it";
    } catch (_) {
      return "it";
    }
  }

  function albumData() {
    try {
      if (typeof galleryData !== "undefined" && Array.isArray(galleryData)) return galleryData;
    } catch (_) {}
    return Array.isArray(window.galleryData) ? window.galleryData : [];
  }

  function localizeAlbumDate(value) {
    const raw = String(value || "").trim();
    const language = currentLanguage();
    if (!raw) return "";
    if (/^coming soon$/i.test(raw)) return language === "it" ? "Prossimamente" : "Coming Soon";
    if (language !== "it") return raw;

    const months = {
      january: "gennaio", february: "febbraio", march: "marzo", april: "aprile",
      may: "maggio", june: "giugno", july: "luglio", august: "agosto",
      september: "settembre", october: "ottobre", november: "novembre", december: "dicembre"
    };
    const match = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})$/);
    if (!match) return raw;
    const month = months[match[2].toLowerCase()];
    return month ? `${Number(match[1])} ${month} ${match[3]}` : raw;
  }

  function clickableImage(src, alt, isCover) {
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    image.loading = isCover ? "eager" : "lazy";
    image.decoding = "async";
    image.dataset.albumImage = isCover ? "cover" : "photo";
    image.addEventListener("click", function () {
      if (typeof window.openImageGallery === "function") window.openImageGallery(image);
    });
    return image;
  }

  function renderSafeAlbumPage() {
    const grid = document.getElementById("albumImagesGrid");
    const data = albumData();
    if (!grid || !data.length) return;

    const albumId = document.body && document.body.dataset ? document.body.dataset.albumId : "";
    const album = data.find(function (item) { return item.id === albumId; });
    if (!album) return;

    const title = document.getElementById("albumTitle");
    const subtitle = document.getElementById("albumSubtitle");
    if (title) title.textContent = album.title || "FIL-ITALIA Album";
    if (subtitle) subtitle.textContent = localizeAlbumDate(album.date);

    grid.replaceChildren();

    const coverSrc = String(album.cover || "images/logo.png");
    const cover = clickableImage(coverSrc, `${album.title || "FIL-ITALIA"} cover`, true);
    cover.classList.add("fil-album-cover-fallback");
    grid.appendChild(cover);

    const explicitImages = Array.isArray(album.images) ? album.images.filter(Boolean) : [];
    const candidates = explicitImages.length
      ? explicitImages
      : Array.from({ length: Math.max(0, Number(album.count) || 0) }, function (_, index) {
          return `${album.folder}/${index + 1}.jpg`;
        });

    let realPhotoLoaded = false;
    candidates.forEach(function (src, index) {
      if (!src || src === coverSrc) return;
      const image = clickableImage(src, `${album.title || "FIL-ITALIA"} ${index + 1}`, false);
      image.hidden = true;
      image.addEventListener("load", function () {
        image.hidden = false;
        if (!realPhotoLoaded) {
          realPhotoLoaded = true;
          cover.hidden = true;
        }
      }, { once: true });
      image.addEventListener("error", function () {
        image.remove();
      }, { once: true });
      grid.appendChild(image);
    });
  }

  window.renderAlbumPage = renderSafeAlbumPage;

  document.addEventListener("click", function (event) {
    if (event.target && event.target.closest && event.target.closest(".language-switch button")) {
      window.setTimeout(renderSafeAlbumPage, 60);
    }
  });
})();
