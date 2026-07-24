(function () {
  "use strict";

  let loaded = false;

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function canLoad() {
    const cfg = window.FILITALIA_CONFIG || {};
    return Boolean(
      !loaded &&
      typeof playersData !== "undefined" &&
      Array.isArray(playersData) &&
      window.supabase &&
      typeof window.supabase.createClient === "function" &&
      cfg.supabaseUrl &&
      cfg.supabasePublishableKey
    );
  }

  async function signedPhotoUrl(client, path) {
    if (!path) return "";
    try {
      const result = await client.storage
        .from("profile-media")
        .createSignedUrl(path, 3600);
      if (result.error) throw result.error;
      return result.data && result.data.signedUrl ? result.data.signedUrl : "";
    } catch (error) {
      console.warn("Player Card photo unavailable", error);
      return "";
    }
  }

  async function loadPublishedPlayerCards() {
    if (!canLoad()) return;
    loaded = true;

    const cfg = window.FILITALIA_CONFIG;
    const client = window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabasePublishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    try {
      const result = await client
        .from("public_player_cards")
        .select("user_id,full_name,birth_year,category,position,height_cm,current_club,city,nationality,instagram,highlights_url,photo_path,published_at")
        .order("published_at", { ascending: false });

      if (result.error) throw result.error;

      const rows = Array.isArray(result.data) ? result.data : [];
      const existingNames = new Set(playersData.map(function (player) {
        return normalizeName(player && player.name);
      }));

      const dynamicPlayers = await Promise.all(rows.map(async function (row) {
        const nameKey = normalizeName(row.full_name);
        if (!nameKey || existingNames.has(nameKey)) return null;

        const photoUrl = await signedPhotoUrl(client, row.photo_path);
        const year = row.birth_year ? String(row.birth_year) : "";
        const position = row.position || "Player";

        existingNames.add(nameKey);

        return {
          id: "account-" + row.user_id,
          name: row.full_name || "FIL-ITALIA Player",
          year: year,
          category: row.category || year,
          role: year ? year + " • " + position : position,
          position: position,
          height: row.height_cm ? String(row.height_cm) + " cm" : "",
          club: row.current_club || "",
          city: row.city || "",
          nationality: row.nationality || "",
          jerseyNumber: "",
          instagram: row.instagram || "",
          handedness: "",
          image: photoUrl || "images/logo.png",
          cardImage: photoUrl || "images/logo.png",
          highlights: row.highlights_url || "#",
          imagePosition: "center top",
          status: "Active",
          source: "supabase"
        };
      }));

      dynamicPlayers.filter(Boolean).forEach(function (player) {
        playersData.push(player);
      });

      if (typeof renderHomePlayers === "function") renderHomePlayers();
      if (typeof renderPlayersPage === "function") renderPlayersPage();
    } catch (error) {
      loaded = false;
      console.warn("Published Player Cards unavailable", error);
    }
  }

  document.addEventListener("DOMContentLoaded", loadPublishedPlayerCards);
})();
