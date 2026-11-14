/* ====== À MODIFIER : informations de la Team MK ====== */
const CONFIG = {
  whatsapp: "22373509033",
  telephones: ["73 50 90 33", "68 26 81 12"],
  adresse: "Bamako, Mali (sebenicoro)",
  devise: "FCFA",
  // Sujet de notification : choisis un nom long et secret, sans espace (ex : teammk-k8x29-reservations)
  notifTopic: "",
  // Numéro où le client envoie son dépôt (null = paiement sur place)
  paiement: {
    "Orange Money": "73 50 90 33",
    "Espèces sur place": null
  }
};

/* ====== À MODIFIER : catalogue du matériel ======
   prix  : prix PAR JOUR (nombre, sans espace) ou null = « Prix sur devis »
   photo : (facultatif) nom d'une autre photo à réutiliser, sinon la photo porte le nom de l'id */
const CATALOGUE = [
  { cat: "Chaises", items: [
    { id: "chaises-plastique", nom: "Chaises plastique", icone: "🪑", prix: 100 },
    { id: "chaises-metalliques", nom: "Chaises métalliques", icone: "🪑", prix: 50 } ] },
  { cat: "Tables", items: [
    { id: "tables", nom: "Tables", icone: "🍽️", prix: null } ] },
  { cat: "Tribunes, scène et lumière", items: [
    { id: "tribunes", nom: "Tribunes (toutes sortes)", icone: "🏟️", prix: null },
    { id: "scene", nom: "Scène (grand modèle)", icone: "🎤", prix: 200000 },
    { id: "scene2", nom: "Scène (modèle moyen)", icone: "🎤", prix: 150000, photo: "scene" },
    { id: "lumiere", nom: "Jeux de lumière", icone: "💡", prix: null } ] },
  { cat: "Tapis", items: [
    { id: "tapis-rouge", nom: "Tapis rouge", icone: "🟥", prix: null },
    { id: "tapis-gazon", nom: "Tapis vert en gazon", icone: "🟩", prix: null } ] },
  { cat: "Autres", items: [
    { id: "baches", nom: "Bâches et tentes", icone: "⛺", prix: 15000 },
    { id: "sono", nom: "Sonorisation", icone: "🔊", prix: 20000 },
    { id: "groupe", nom: "Groupe électrogène", icone: "⚡", prix: null },
    { id: "deco", nom: "Décoration", icone: "🎈", prix: null } ] }
];
/* ================================================= */

const $ = (s) => document.querySelector(s);
const tous = CATALOGUE.flatMap((c) => c.items);
const panier = {};
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + CONFIG.devise;
const tel = (t) => "tel:+223" + t.replace(/\s/g, "");
const wa = (txt) => "https://wa.me/" + CONFIG.whatsapp + (txt ? "?text=" + encodeURIComponent(txt) : "");
const dateFr = (d, h) => new Date(d + "T" + h).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" }).replace(/[\u202f\u00a0]/g, " ");

// Coordonnées
$("#adresse").textContent = CONFIG.adresse;
$("#carte").src = "https://www.google.com/maps?q=" + encodeURIComponent(CONFIG.adresse) + "&output=embed";
["t1", "t2"].forEach((id, i) => { const a = $("#" + id); a.textContent = CONFIG.telephones[i]; a.href = tel(CONFIG.telephones[i]); });
$("#lienWa").href = wa();
$("#waFloat").href = wa("Bonjour Team MK, j’aimerais avoir des informations.");

// Modes de paiement (cases à cocher)
const modes = Object.keys(CONFIG.paiement);
$("#paiement").innerHTML = modes.map((m, i) => `<label class="radio"><input type="radio" name="paiement" value="${m}" ${i === 0 ? "checked" : ""}> ${m}</label>`).join("");
function infoPaiement(mode) {
  const num = CONFIG.paiement[mode];
  return num
    ? "Envoyez votre dépôt par " + mode + " au " + num + ", puis envoyez la capture d’écran sur WhatsApp."
    : "Vous payez en espèces sur place, à la livraison ou au retrait du matériel.";
}
$("#payinfo").textContent = infoPaiement(modes[0]);
$("#paiement").addEventListener("change", (e) => { $("#payinfo").textContent = infoPaiement(e.target.value); });

// Photos : essaie plusieurs formats (jpeg, jpg, png, webp)
const EXT = ["jpeg", "jpg", "png", "webp"];
function essai(img) {
  const i = Number(img.dataset.i || 0) + 1;
  if (i < EXT.length) { img.dataset.i = i; img.src = img.src.replace(/\.[a-z]+$/i, "." + EXT[i]); }
  else img.remove();
}

// Catalogue avec photos
$("#catalogue").innerHTML = CATALOGUE.map((c) => `
  <div class="cat"><h3>${c.cat}</h3><div class="catalogue">${c.items.map((m) => `
    <div class="item">
      <div class="ph"><span aria-hidden="true">${m.icone}</span><img src="images/${m.photo || m.id}.jpeg" alt="${m.nom}" loading="lazy" onerror="essai(this)"></div>
      <b>${m.nom}</b>
      <small>${m.prix ? fmt(m.prix) + " / jour" : "Prix sur devis"}</small>
      <div class="qty">
        <button type="button" data-id="${m.id}" data-d="-1" aria-label="Retirer ${m.nom}">−</button>
        <output id="q-${m.id}">0</output>
        <button type="button" data-id="${m.id}" data-d="1" aria-label="Ajouter ${m.nom}">+</button>
      </div>
    </div>`).join("")}</div></div>`).join("");

$("#catalogue").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (!b) return;
  const id = b.dataset.id;
  const pas = Number(b.dataset.d) * (e.shiftKey ? 10 : 1);
  panier[id] = Math.max(0, (panier[id] || 0) + pas);
  $("#q-" + id).textContent = panier[id];
  majPanier();
});

const lignes = () => tous.filter((m) => panier[m.id] > 0).map((m) => ({ ...m, qte: panier[m.id] }));

// Calculateur : nombre de jours (24 h = 1 jour) et totaux
function jours() {
  const f = $("#cmd").elements;
  if (!f.d1.value || !f.d2.value) return 1;
  const a = new Date(f.d1.value + "T" + (f.h1.value || "00:00"));
  const b = new Date(f.d2.value + "T" + (f.h2.value || "00:00"));
  if (b <= a) return 1;
  return Math.max(1, Math.ceil((b - a) / 86400000));
}
function calcul(l) {
  const parJour = l.reduce((s, x) => s + (x.prix ? x.prix * x.qte : 0), 0);
  const nb = jours();
  return { parJour, nb, total: parJour * nb, devis: l.some((x) => !x.prix) };
}

function majPanier() {
  const l = lignes();
  $("#lignes").innerHTML = l.length
    ? l.map((x) => `<li><span>${x.qte} × ${x.nom}</span><span>${x.prix ? fmt(x.prix * x.qte) : "Sur devis"}</span></li>`).join("")
    : '<li class="vide">Aucun article pour l’instant.</li>';
  if (!l.length) { $("#calc").innerHTML = ""; return; }
  const c = calcul(l);
  $("#calc").innerHTML =
    (c.parJour ? `<div><span>Total par jour</span><span>${fmt(c.parJour)}</span></div>
      <div><span>Durée</span><span>${c.nb} jour${c.nb > 1 ? "s" : ""}</span></div>
      <div class="grand"><span>Total estimé</span><span>${fmt(c.total)}</span></div>` : "") +
    (c.devis ? `<small>${c.parJour ? "+ articles" : "Articles"} sur devis : prix confirmé par la Team MK.</small>` : "");
}
$("#cmd").addEventListener("input", majPanier);

// Reçu PDF
function creerPdf(ref, d, l, c) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFillColor(15, 59, 42); doc.rect(0, 0, 210, 36, "F");
  doc.setTextColor(246, 248, 243); doc.setFontSize(24); doc.text("Team MK", 14, 17);
  doc.setFontSize(12); doc.text("Reçu de réservation de matériel événementiel", 14, 27);
  doc.setTextColor(18, 35, 27); doc.setFontSize(12);
  let y = 50;
  const verif = (h) => { if (y + h > 275) { doc.addPage(); y = 20; } };
  const ligne = (a, b) => { verif(10); doc.setFont("helvetica", "bold"); doc.text(a, 14, y); doc.setFont("helvetica", "normal"); const t = doc.splitTextToSize(b, 120); doc.text(t, 62, y); y += 8 * Math.max(1, t.length); };
  ligne("Référence :", ref);
  ligne("Date :", new Date().toLocaleDateString("fr-FR"));
  ligne("Client :", d.prenom + " " + d.nom);
  ligne("Téléphone :", d.tel);
  ligne("Quartier :", d.quartier);
  ligne("Lieu :", d.lieu);
  ligne("Début :", dateFr(d.d1, d.h1));
  ligne("Fin :", dateFr(d.d2, d.h2));
  ligne("Durée :", c.nb + " jour" + (c.nb > 1 ? "s" : ""));
  ligne("Paiement :", d.paiement);

  y += 4; verif(20); doc.setFont("helvetica", "bold"); doc.text("Matériel réservé", 14, y); y += 8;
  doc.setFontSize(11);
  doc.text("Article", 14, y); doc.text("Qté", 112, y, { align: "right" });
  doc.text("Prix / jour", 152, y, { align: "right" }); doc.text("Total / jour", 196, y, { align: "right" });
  y += 3; doc.line(14, y, 196, y); y += 6; doc.setFont("helvetica", "normal");
  l.forEach((x) => {
    verif(8);
    doc.text(x.nom, 14, y); doc.text(String(x.qte), 112, y, { align: "right" });
    doc.text(x.prix ? fmt(x.prix) : "Sur devis", 152, y, { align: "right" });
    doc.text(x.prix ? fmt(x.prix * x.qte) : "Sur devis", 196, y, { align: "right" });
    y += 7;
  });
  doc.line(14, y - 3, 196, y - 3); y += 5;
  verif(20); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  if (c.parJour) {
    doc.text("Total estimé (" + c.nb + " jour" + (c.nb > 1 ? "s" : "") + ") :", 14, y);
    doc.text(fmt(c.total), 196, y, { align: "right" }); y += 8;
  }
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  if (c.devis) { verif(8); doc.text("Les articles sur devis seront chiffrés par la Team MK.", 14, y); y += 7; }
  doc.setFontSize(12);
  if (d.note) { verif(20); doc.setFont("helvetica", "bold"); doc.text("Remarques :", 14, y); doc.setFont("helvetica", "normal"); y += 7; const r = doc.splitTextToSize(d.note, 175); doc.text(r, 14, y); y += 7 * r.length; }
  y += 6; verif(34); doc.setFillColor(245, 183, 0); doc.rect(14, y, 182, 30, "F");
  doc.setFont("helvetica", "bold"); doc.text("Votre réservation est enregistrée.", 18, y + 10);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize("Elle sera confirmée par la Team MK après votre dépôt. Gardez ce reçu.", 172), 18, y + 18);
  doc.setFontSize(10); doc.text("Team MK, " + CONFIG.adresse + "  |  " + CONFIG.telephones.join(" / "), 14, 285);
  doc.save("Recu-Team-MK-" + ref + ".pdf");
}

// Notification discrète : aucune donnée personnelle (ni nom, ni téléphone, ni adresse)
function notifier(ref, d, l, c) {
  if (!CONFIG.notifTopic) return;
  const message = [...l.map((x) => x.qte + " x " + x.nom),
    "Du " + dateFr(d.d1, d.h1) + " au " + dateFr(d.d2, d.h2),
    "Total estimé : " + (c.parJour ? fmt(c.total) : "sur devis") + (c.devis && c.parJour ? " + articles sur devis" : ""),
    "Les coordonnées du client arrivent sur WhatsApp."].join("\n");
  fetch("https://ntfy.sh/", {
    method: "POST",
    body: JSON.stringify({ topic: CONFIG.notifTopic, title: "Nouvelle réservation " + ref, message: message, priority: 4, tags: ["bell"] })
  }).catch(() => {});
}

// Validation de la réservation
$("#cmd").addEventListener("submit", (e) => {
  e.preventDefault();
  const l = lignes();
  const err = $("#err");
  if (!l.length) { err.textContent = "Ajoutez au moins un article à votre réservation."; return; }
  const d = Object.fromEntries(new FormData(e.target));
  if (new Date(d.d2 + "T" + d.h2) <= new Date(d.d1 + "T" + d.h1)) { err.textContent = "La fin de la location doit être après le début."; return; }
  err.textContent = "";
  const c = calcul(l);
  const now = new Date();
  const ref = "MK-" + String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0") + "-" + Math.floor(1000 + Math.random() * 9000);
  let pdfOk = true;
  try { creerPdf(ref, d, l, c); } catch (x) { pdfOk = false; }
  notifier(ref, d, l, c);
  const totalTxt = c.parJour ? "Total estimé : " + fmt(c.total) + " (" + c.nb + " jour" + (c.nb > 1 ? "s" : "") + ")" + (c.devis ? " + articles sur devis" : "") : "Total : sur devis";
  const msg = ["Bonjour Team MK, voici ma réservation " + ref + " :",
    ...l.map((x) => "- " + x.qte + " x " + x.nom + (x.prix ? " (" + fmt(x.prix * x.qte) + " / jour)" : " (sur devis)")), "",
    totalTxt, "",
    "Nom : " + d.nom, "Prénom : " + d.prenom, "Téléphone : " + d.tel, "Quartier : " + d.quartier, "Lieu : " + d.lieu,
    "Début : " + dateFr(d.d1, d.h1), "Fin : " + dateFr(d.d2, d.h2), "Paiement : " + d.paiement, d.note ? "Remarques : " + d.note : ""].filter((x) => x !== undefined && x !== false).join("\n");
  const box = $("#done");
  box.innerHTML = `<p><b>Merci ${d.prenom} !</b> Votre réservation <b>${ref}</b> est enregistrée. <b>Pour que la Team MK la reçoive, cliquez sur « Envoyer sur WhatsApp » ci-dessous.</b>
    <p>${c.parJour ? "<b>" + totalTxt + ".</b> " : ""}${pdfOk ? "Votre reçu PDF vient d’être téléchargé. " : "Le reçu PDF n’a pas pu être créé, la Team MK vous l’enverra. "}${infoPaiement(d.paiement)} Après votre dépôt, nous vous envoyons un message de confirmation pour vous rassurer.</p>
    <a class="btn" target="_blank" rel="noopener" href="${wa(msg)}">Envoyer sur WhatsApp</a>`;
  box.style.display = "block"; e.target.style.display = "none";
  box.scrollIntoView({ behavior: "smooth", block: "center" });
  window.open(wa(msg), "_blank");
});