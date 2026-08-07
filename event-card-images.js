/* FIL-ITALIA event cards with poster previews + Messina poster loader */
(function(){
  const MESSINA_ID = "idcamp-messina-2026";
  const POSTER_PARTS = [
    "assets/messina-poster-01.txt",
    "assets/messina-poster-02.txt",
    "assets/messina-poster-03.txt"
  ];

  function shareLabel(){
    try{
      const l = typeof lang === "function" ? lang() : "it";
      if(l === "en") return "Share";
      if(l === "ph") return "I-share";
    }catch(error){}
    return "Condividi";
  }

  window.buildEventCard = function(item, index){
    const defaultLink = `camp-register.html?event=${encodeURIComponent(item.id || "")}`;
    const link = item.ticket || defaultLink;
    const eventId = safe(item.id || item.slug || "");
    const title = localEvent(item, "title") || "Event";
    const isMessina = String(item.id || "") === MESSINA_ID;
    const image = isMessina && window.__FILITALIA_MESSINA_POSTER
      ? window.__FILITALIA_MESSINA_POSTER
      : (item.cardImage || item.image || "images/logo.png");

    return `
      <div class="event-card event-card-with-cover" data-event-id="${eventId}" onclick="openEventByIndex(${index})">
        <img class="event-cover" src="${safe(image)}" alt="${safe(title)}" onerror="this.onerror=null;this.src='images/logo.png';">
        <div class="event-card-content">
          <span class="event-card-date">${autoTextHTML(item,"date",localEvent(item,"date"),0)}</span>
          <h3>${autoTextHTML(item,"title",localEvent(item,"title"),48)}</h3>
          <p class="event-card-location">${autoTextHTML(item,"location",localEvent(item,"location"),58)}</p>
          <div class="event-card-actions">
            <button type="button" class="event-share-button" onclick="event.preventDefault();event.stopPropagation();shareFilitalia('event', getVisibleEvents().find(e => String(e.id || e.slug || '') === '${eventId}') || getVisibleEvents()[${index}]);">${shareLabel()}</button>
            <a class="ticket-button" href="${safe(link)}" onclick="event.stopPropagation();">${safe(tr("registerNow"))}</a>
          </div>
        </div>
      </div>`;
  };

  async function loadMessinaPoster(){
    try{
      const responses = await Promise.all(POSTER_PARTS.map(path => fetch(path, {cache:"no-store"})));
      if(responses.some(response => !response.ok)) throw new Error("Poster part unavailable");
      const parts = await Promise.all(responses.map(response => response.text()));
      const poster = "data:image/jpeg;base64," + parts.map(part => part.trim()).join("");
      window.__FILITALIA_MESSINA_POSTER = poster;

      if(typeof eventsData !== "undefined"){
        const messina = eventsData.find(event => String(event.id || "") === MESSINA_ID);
        if(messina){
          messina.image = poster;
          messina.cardImage = poster;
        }
      }

      const pageImage = document.getElementById("messinaCampImage");
      if(pageImage) pageImage.src = poster;

      document.querySelectorAll(`[data-event-id="${MESSINA_ID}"] .event-cover`).forEach(image => {
        image.src = poster;
      });

      if(typeof renderEvents === "function" && (document.getElementById("homeEventsGrid") || document.getElementById("allEventsGrid"))){
        renderEvents();
      }
    }catch(error){
      console.warn("Messina poster could not be loaded", error);
    }
  }

  function boot(){
    if(typeof renderEvents === "function" && (document.getElementById("homeEventsGrid") || document.getElementById("allEventsGrid"))){
      renderEvents();
    }
    loadMessinaPoster();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
