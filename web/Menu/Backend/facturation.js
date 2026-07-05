/* ============================================
   SanaLite RDC — Facturation JS
   ============================================ */

"use strict";

/* ============================================
   STATE
   ============================================ */
let lignes = [];
let ligneCounter = 1;

/* ============================================
   INIT
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
    // Mode sombre — appliquer avant tout rendu pour éviter le flash
    appliquerThemeSauvegarde();

    genererNumeroFacture();
    remplirDatesParDefaut();
    renderTable();
    calculer();

    // Recalcul en temps réel
    document.getElementById("remise").addEventListener("input", calculer);
    document.getElementById("montant_recu").addEventListener("input", calculerReste);

    // Ajout via touche Entrée
    ["designation", "categorie", "quantite", "pu"].forEach(id => {
        document.getElementById(id).addEventListener("keydown", e => {
            if (e.key === "Enter") ajouter();
        });
    });

    // Effacer erreurs visuelles en tapant
    ["nom_patient", "dossier"].forEach(id => {
        document.getElementById(id).addEventListener("input", function () {
            clearError(this);
        });
    });
});

// =========================
// MODE SOMBRE
// =========================

// Vérifie le mode au chargement

window.onload = function () {
  let mode = localStorage.getItem("theme");

  if (mode === "sombre") {
    document.body.classList.add("sombre");

    document.querySelector(".darkmode").innerHTML = "☀️";
  }
};

// Changer le mode

function changerMode() {
  document.body.classList.toggle("sombre");

  let bouton = document.querySelector(".darkmode");

  // Si mode sombre activé

  if (document.body.classList.contains("sombre")) {
    bouton.innerHTML = "☀️";

    localStorage.setItem("theme", "sombre");
  } else {
    bouton.innerHTML = "🌙";

    localStorage.setItem("theme", "clair");
  }
}

let medecins = JSON.parse(localStorage.getItem("medecins")) || [];

/**
 * Bascule entre clair et sombre, sauvegarde la préférence.
 */
function changerMode() {
    const estSombre = document.body.classList.toggle("sombre");
    localStorage.setItem("sanalite_theme", estSombre ? "sombre" : "clair");
    majIconeDarkmode();
}

/**
 * Met à jour l'icône du bouton selon le thème actif.
 */
function majIconeDarkmode() {
    const btn = document.getElementById("darkmode_btn");
    if (!btn) return;
    const estSombre = document.body.classList.contains("sombre");
    btn.textContent = estSombre ? "☀️" : "🌙";
    btn.title = estSombre ? "Passer en mode clair" : "Passer en mode sombre";
}

/* ============================================
   NUMÉRO DE FACTURE
   ============================================ */
function genererNumeroFacture() {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = String(d.getMonth() + 1).padStart(2, "0");
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    document.getElementById("facture_num").textContent = `${annee}${mois}-${rand}`;
}

/* ============================================
   DATES PAR DÉFAUT
   ============================================ */
function remplirDatesParDefaut() {
    const auj = new Date();
    const ech = new Date();
    ech.setDate(auj.getDate() + 30);
    document.getElementById("date_emission").value = formatDate(auj);
    document.getElementById("echeance").value      = formatDate(ech);
}

function formatDate(d) {
    return d.toISOString().split("T")[0];
}

/* ============================================
   FORMATAGE MONNAIE
   ============================================ */
function fmt(n) {
    return Number(n).toLocaleString("fr-CD") + " FC";
}

/* ============================================
   AJOUTER UNE LIGNE
   ============================================ */
function ajouter() {
    const designation = document.getElementById("designation").value.trim();
    const categorie   = document.getElementById("categorie").value;
    const quantite    = parseFloat(document.getElementById("quantite").value) || 0;
    const pu          = parseFloat(document.getElementById("pu").value) || 0;

    let ok = true;
    if (!designation) { document.getElementById("designation").classList.add("error"); ok = false; }
    if (quantite <= 0) { document.getElementById("quantite").classList.add("error");  ok = false; }
    if (pu <= 0)       { document.getElementById("pu").classList.add("error");         ok = false; }
    if (!ok) return;

    lignes.push({ id: ligneCounter++, designation, categorie, quantite, pu, total: quantite * pu });

    document.getElementById("designation").value = "";
    document.getElementById("quantite").value    = "1";
    document.getElementById("pu").value          = "";
    ["designation", "quantite", "pu"].forEach(id =>
        document.getElementById(id).classList.remove("error")
    );
    document.getElementById("designation").focus();

    renderTable();
    calculer();
}

/* ============================================
   SUPPRIMER UNE LIGNE
   ============================================ */
function supprimerLigne(id) {
    lignes = lignes.filter(l => l.id !== id);
    renderTable();
    calculer();
}

/* ============================================
   RENDU DU TABLEAU
   ============================================ */
function renderTable() {
    const tbody = document.getElementById("table_body");

    if (lignes.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">Aucun acte ajouté — remplissez le formulaire ci-dessus et cliquez sur <strong>+ Ajouter</strong></td>
            </tr>`;
        return;
    }

    tbody.innerHTML = lignes.map((l, i) => `
        <tr>
            <td class="td-center" style="color:var(--text-muted);font-size:12px">${i + 1}</td>
            <td><strong>${escapeHtml(l.designation)}</strong></td>
            <td><span class="categorie-badge">${escapeHtml(l.categorie)}</span></td>
            <td class="td-right">${l.quantite}</td>
            <td class="td-right">${fmt(l.pu)}</td>
            <td class="td-right"><strong>${fmt(l.total)}</strong></td>
            <td class="td-center">
                <button class="del-btn" onclick="supprimerLigne(${l.id})" title="Supprimer">✕</button>
            </td>
        </tr>
    `).join("");
}

/* ============================================
   CALCULS
   ============================================ */
function calculer() {
    const sousTotal     = lignes.reduce((s, l) => s + l.total, 0);
    const remisePct     = Math.max(0, Math.min(100, parseFloat(document.getElementById("remise").value) || 0));
    const montantRemise = sousTotal * (remisePct / 100);
    const total         = sousTotal - montantRemise;

    document.getElementById("sous_total").textContent     = fmt(sousTotal);
    document.getElementById("montant_remise").textContent = "- " + fmt(montantRemise);
    document.getElementById("total_final").textContent    = fmt(total);

    calculerReste();
}

function calculerReste() {
    const sousTotal = lignes.reduce((s, l) => s + l.total, 0);
    const remisePct = Math.max(0, Math.min(100, parseFloat(document.getElementById("remise").value) || 0));
    const total     = sousTotal * (1 - remisePct / 100);
    const recu      = parseFloat(document.getElementById("montant_recu").value) || 0;
    const reste     = Math.max(0, total - recu);

    const soldeEl   = document.getElementById("solde_display");
    const alerteEl  = document.getElementById("reste_alerte");
    const resteVal  = document.getElementById("reste_val");
    const badge     = document.getElementById("badge_statut");
    const badgePaye = document.getElementById("badge_paye");

    soldeEl.textContent = fmt(reste);
    soldeEl.style.color = reste > 0 ? "#f87171" : "#22c55e";

    if (recu > 0 && reste > 0) {
        alerteEl.classList.add("visible");
        resteVal.textContent = fmt(reste);
    } else {
        alerteEl.classList.remove("visible");
    }

    if (recu > 0 && reste === 0) {
        badge.style.display     = "none";
        badgePaye.style.display = "inline-block";
    } else {
        badge.style.display     = "inline-block";
        badgePaye.style.display = "none";
    }
}

/* ============================================
   VALIDATION
   ============================================ */
function validerFormulaire() {
    let ok = true;

    [
        { id: "nom_patient", errId: "err_nom",     msg: "Le nom du patient est requis." },
        { id: "dossier",     errId: "err_dossier", msg: "Le numéro de dossier est requis." }
    ].forEach(({ id, errId, msg }) => {
        const el  = document.getElementById(id);
        const err = document.getElementById(errId);
        if (!el.value.trim()) {
            el.classList.add("error");
            if (err) { err.textContent = msg; err.classList.add("visible"); }
            ok = false;
        }
    });

    if (lignes.length === 0) {
        alert("Ajoutez au moins un acte ou soin avant d'enregistrer.");
        ok = false;
    }

    return ok;
}

function clearError(el) {
    el.classList.remove("error");
    const err = el.parentElement.querySelector(".err-msg");
    if (err) err.classList.remove("visible");
}

/* ============================================
   ENREGISTRER
   ============================================ */
function enregistrer() {
    if (!validerFormulaire()) return;

    const num       = document.getElementById("facture_num").textContent;
    const nom       = document.getElementById("nom_patient").value.trim();
    const sousTotal = lignes.reduce((s, l) => s + l.total, 0);
    const remisePct = parseFloat(document.getElementById("remise").value) || 0;
    const total     = sousTotal * (1 - remisePct / 100);
    const recu      = parseFloat(document.getElementById("montant_recu").value) || 0;
    const reste     = Math.max(0, total - recu);
    const statut    = (reste === 0 && recu > 0) ? "SOLDÉE" : "EN ATTENTE";

    alert(
        `✅ Facture #${num} enregistrée !\n\n` +
        `Patient : ${nom}\n` +
        `Total   : ${fmt(total)}\n` +
        `Reçu    : ${fmt(recu)}\n` +
        `Reste   : ${fmt(reste)}\n` +
        `Statut  : ${statut}`
    );

    // TODO: envoyerAuServeur({ num, nom, lignes, total, recu, reste, statut });
}

/* ============================================
   ANNULER
   ============================================ */
function annuler() {
    if (!confirm("Annuler cette facture ? Toutes les données saisies seront perdues.")) return;
    reinitialiser();
}

/* ============================================
   RÉINITIALISER
   ============================================ */
function reinitialiser() {
    lignes = [];
    ligneCounter = 1;

    [
        "nom_patient", "dossier", "telephone", "date_naissance",
        "cree_par", "valide_par", "notes",
        "designation", "reference", "montant_recu"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ""; el.classList.remove("error"); }
    });

    document.getElementById("quantite").value = "1";
    document.getElementById("pu").value       = "";
    document.getElementById("remise").value   = "0";
    document.getElementById("categorie").selectedIndex     = 0;
    document.getElementById("mode_paiement").selectedIndex = 0;

    document.querySelectorAll(".err-msg").forEach(e => e.classList.remove("visible"));

    genererNumeroFacture();
    remplirDatesParDefaut();
    renderTable();
    calculer();
}

/* ============================================
   IMPRESSION
   ============================================ */
function imprimer() {
    const num       = document.getElementById("facture_num").textContent;
    const nom       = document.getElementById("nom_patient").value    || "—";
    const dossier   = document.getElementById("dossier").value         || "—";
    const tel       = document.getElementById("telephone").value       || "—";
    const dateEm    = document.getElementById("date_emission").value   || "—";
    const echeance  = document.getElementById("echeance").value        || "—";
    const creePar   = document.getElementById("cree_par").value        || "—";
    const validePar = document.getElementById("valide_par").value      || "—";
    const notes     = document.getElementById("notes").value           || "";
    const mode      = document.getElementById("mode_paiement").value;
    const ref       = document.getElementById("reference").value       || "—";

    const sousTotal     = lignes.reduce((s, l) => s + l.total, 0);
    const remisePct     = parseFloat(document.getElementById("remise").value) || 0;
    const montantRemise = sousTotal * (remisePct / 100);
    const total         = sousTotal - montantRemise;
    const recu          = parseFloat(document.getElementById("montant_recu").value) || 0;
    const reste         = Math.max(0, total - recu);

    const lignesHTML = lignes.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Aucun acte enregistré</td></tr>`
        : lignes.map((l, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(l.designation)}
                    <span style="background:#dbeafe;color:#1e40af;font-size:10px;padding:2px 7px;border-radius:10px;margin-left:6px">${escapeHtml(l.categorie)}</span>
                </td>
                <td style="text-align:right">${l.quantite}</td>
                <td style="text-align:right">${fmt(l.pu)}</td>
                <td style="text-align:right;font-weight:700">${fmt(l.total)}</td>
            </tr>`).join("");

    const statutHtml = (recu > 0 && reste === 0)
        ? `<span style="background:#15803d;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px">✓ SOLDÉE</span>`
        : `<span style="background:#f59e0b;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px">EN ATTENTE</span>`;

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture ${num} — SanaLite RDC</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#1f2937;padding:30px 40px;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #1e3a8a}
  .logo{background:#1e3a8a;color:#fff;font-weight:700;font-size:15px;padding:10px 16px;border-radius:8px}
  .facture-title{text-align:right}
  .facture-title h1{font-size:22px;color:#1e3a8a}
  .facture-title p{font-size:12px;color:#64748b;margin-top:3px}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:22px}
  .section h4{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8;margin-bottom:8px}
  .section p{font-size:13px;margin-bottom:4px}
  .section p span{color:#64748b}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead th{background:#1e3a8a;color:#fff;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase}
  tbody td{padding:9px 12px;border-bottom:1px solid #f1f5f9}
  tbody tr:last-child td{border-bottom:none}
  .totaux{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;max-width:320px;margin-left:auto}
  .tot-ligne{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:#475569}
  .tot-ligne.final{font-weight:700;font-size:15px;color:#0f172a;border-top:1px solid #e2e8f0;margin-top:6px;padding-top:10px}
  .footer{margin-top:30px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
  @media print{body{padding:15px 20px}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">🏥 SanaLite_RDC</div>
    <p style="font-size:11px;color:#64748b;margin-top:6px">Système de gestion hospitalière</p>
  </div>
  <div class="facture-title">
    <h1>FACTURE #${num}</h1>
    <p>Émission : ${dateEm}</p>
    <p>Échéance : ${echeance}</p>
    <div style="margin-top:6px">${statutHtml}</div>
  </div>
</div>
<div class="two">
  <div class="section">
    <h4>Patient</h4>
    <p><strong>${escapeHtml(nom)}</strong></p>
    <p><span>Dossier :</span> ${escapeHtml(dossier)}</p>
    <p><span>Téléphone :</span> ${escapeHtml(tel)}</p>
  </div>
  <div class="section">
    <h4>Émis par</h4>
    <p><span>Créé par :</span> ${escapeHtml(creePar)}</p>
    <p><span>Validé par :</span> ${escapeHtml(validePar)}</p>
    <p><span>Mode :</span> ${escapeHtml(mode)}</p>
    <p><span>Référence :</span> ${escapeHtml(ref)}</p>
  </div>
</div>
${notes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#92400e"><strong>Notes :</strong> ${escapeHtml(notes)}</div>` : ""}
<table>
  <thead>
    <tr><th>#</th><th>Désignation</th><th style="text-align:right">Qté</th><th style="text-align:right">P.U</th><th style="text-align:right">Total</th></tr>
  </thead>
  <tbody>${lignesHTML}</tbody>
</table>
<div class="totaux">
  <div class="tot-ligne"><span>Sous-total</span><span>${fmt(sousTotal)}</span></div>
  <div class="tot-ligne"><span>Remise (${remisePct}%)</span><span style="color:#dc2626">- ${fmt(montantRemise)}</span></div>
  <div class="tot-ligne final"><span>Total à payer</span><span>${fmt(total)}</span></div>
  <div class="tot-ligne" style="margin-top:8px"><span>Montant reçu</span><span style="color:#15803d">${fmt(recu)}</span></div>
  <div class="tot-ligne"><span>Reste à payer</span><span style="color:${reste > 0 ? "#dc2626" : "#15803d"};font-weight:700">${fmt(reste)}</span></div>
</div>
<div class="footer">SanaLite RDC — Système de Gestion Hospitalière &nbsp;|&nbsp; Généré le ${new Date().toLocaleDateString("fr-CD")} &nbsp;|&nbsp; Document officiel</div>
<script>window.onload = () => window.print();<\/script>
</body></html>`);
    win.document.close();
}

/* ============================================
   UTILITAIRE — ÉCHAPPER HTML
   ============================================ */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/* ============================================
   EXPOSITION GLOBALE
   ============================================ */
window.ajouter        = ajouter;
window.supprimerLigne = supprimerLigne;
window.enregistrer    = enregistrer;
window.annuler        = annuler;
window.reinitialiser  = reinitialiser;
window.imprimer       = imprimer;
window.changerMode    = changerMode;