(function () {
  "use strict";
  function lang() {
    try {
      return localStorage.getItem("language") || "it";
    } catch (_) {
      return "it";
    }
  }
  function tr(v) {
    const l = lang();
    return v && typeof v === "object"
      ? v[l] || v.it || v.en || v.ph || ""
      : String(v || "");
  }
  function esc(v) {
    return String(v || "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c],
    );
  }
  const copy = {
    it: {
      k: "PARTNER FIL-ITALIA",
      h: "Insieme facciamo crescere il talento",
      p: "Collaboriamo con aziende e realtà che condividono sport, formazione e opportunità internazionali.",
      cta: "Diventa Sponsor",
      active: "I nostri Sponsor",
      empty: "Le nuove partnership saranno presentate presto.",
      plans: "Scegli la collaborazione",
      annual: "Partner annuale",
      annualD:
        "Presenza continuativa sul sito e negli eventi FIL-ITALIA per dodici mesi.",
      monthly: "Partner mensile",
      monthlyD:
        "Una collaborazione flessibile, attiva per il periodo concordato.",
      event: "Sponsor di un evento",
      eventD:
        "Logo e ringraziamento dedicato nella pagina dello specifico torneo o camp.",
      visit: "Visita il sito",
    },
    en: {
      k: "FIL-ITALIA PARTNERS",
      h: "Together, we grow talent",
      p: "We work with companies and organizations that share our commitment to sport, education and international opportunities.",
      cta: "Become a Sponsor",
      active: "Our Sponsors",
      empty: "New partnerships will be presented soon.",
      plans: "Choose a partnership",
      annual: "Annual partner",
      annualD:
        "Ongoing presence on the website and at FIL-ITALIA events for twelve months.",
      monthly: "Monthly partner",
      monthlyD: "A flexible partnership active for the agreed period.",
      event: "Event sponsor",
      eventD:
        "Logo and dedicated thanks on the selected tournament or camp page.",
      visit: "Visit website",
    },
    ph: {
      k: "FIL-ITALIA PARTNERS",
      h: "Sama-sama nating palaguin ang talento",
      p: "Nakikipagtulungan kami sa mga kompanya at organisasyong sumusuporta sa sports, edukasyon at international opportunities.",
      cta: "Maging Sponsor",
      active: "Aming mga Sponsor",
      empty: "Malapit nang ipakilala ang mga bagong partnership.",
      plans: "Pumili ng partnership",
      annual: "Taunang partner",
      annualD:
        "Tuloy-tuloy na presensya sa website at FIL-ITALIA events sa loob ng labindalawang buwan.",
      monthly: "Buwanang partner",
      monthlyD: "Flexible na partnership para sa napagkasunduang panahon.",
      event: "Sponsor ng event",
      eventD:
        "Logo at espesyal na pasasalamat sa napiling tournament o camp page.",
      visit: "Bisitahin ang website",
    },
  };
  function valid(s) {
    const today = new Date().toISOString().slice(0, 10);
    return (
      (s.status || "active") === "active" &&
      (!s.starts_at || s.starts_at <= today) &&
      (!s.ends_at || s.ends_at >= today)
    );
  }
  function render() {
    const t = copy[lang()] || copy.it,
      root = document.querySelector("[data-sponsors-app]");
    if (!root) return;
    const list = (window.sponsorsData || []).filter(valid);
    root.innerHTML =
      '<section class="sponsors-hero"><span class="sponsors-kicker">' +
      t.k +
      "</span><h1>" +
      t.h +
      "</h1><p>" +
      t.p +
      '</p><a class="sponsors-cta" href="contact.html?subject=sponsor">' +
      t.cta +
      '</a></section><section class="sponsors-section"><h2>' +
      t.active +
      '</h2><div class="sponsors-grid">' +
      (list.length
        ? list
            .map((s) => {
              const logo = s.logo_url
                ? '<img src="' +
                  esc(s.logo_url) +
                  '" alt="' +
                  esc(s.name) +
                  '">'
                : "";
              const text =
                s.show_text === false
                  ? ""
                  : "<h3>" +
                    esc(s.name) +
                    "</h3><p>" +
                    esc(tr(s.description)) +
                    "</p>" +
                    (s.website_url
                      ? '<span class="sponsor-site-label">' +
                        t.visit +
                        "</span>"
                      : "");
              const body = logo + text;
              return s.website_url
                ? '<a class="sponsor-card sponsor-card-link" href="' +
                    esc(s.website_url) +
                    '" target="_blank" rel="noopener" aria-label="' +
                    esc(s.name) +
                    '">' +
                    body +
                    "</a>"
                : '<article class="sponsor-card">' + body + "</article>";
            })
            .join("")
        : '<div class="sponsor-empty">' + t.empty + "</div>") +
      '</div></section><section class="sponsors-section"><h2>' +
      t.plans +
      '</h2><div class="sponsor-plans"><article class="sponsor-plan"><span>12 MESI</span><h3>' +
      t.annual +
      "</h3><p>" +
      t.annualD +
      '</p></article><article class="sponsor-plan"><span>1+ MESI</span><h3>' +
      t.monthly +
      "</h3><p>" +
      t.monthlyD +
      '</p></article><article class="sponsor-plan"><span>EVENTO</span><h3>' +
      t.event +
      "</h3><p>" +
      t.eventD +
      "</p></article></div></section>";
  }
  window.renderSponsorsPage = render;
  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("filitalia:public-content-updated", render);
  window.addEventListener("storage", render);
})();
