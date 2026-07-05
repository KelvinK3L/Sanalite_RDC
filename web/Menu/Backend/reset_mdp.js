/* ============================================================
   SanaLite RDC — Logique Reset Mot de Passe Admin
   À inclure dans personnel.html :
       <script src="Backend/reset_mdp.js"></script>
   (après script.js)
   ============================================================ */

"use strict";

/* ---- État interne ---- */
let _ancienMdpVerifie = false;

/* ============================================================
   OUVRIR / FERMER LE POPUP
   ============================================================ */

function ouvrirResetMdp() {
    _ancienMdpVerifie = false;
    _resetFormulaire();
    _allerStep(1);
    document.getElementById("popupResetMdp").style.display = "flex";
    setTimeout(() => document.getElementById("ancienMdp").focus(), 200);
}

function fermerResetMdp() {
    document.getElementById("popupResetMdp").style.display = "none";
    _resetFormulaire();
}

/* ============================================================
   ÉTAPE 1 — Vérifier l'ancien mot de passe
   ============================================================ */

async function verifierAncienMdp() {
    const ancien = document.getElementById("ancienMdp").value.trim();
    const errEl  = document.getElementById("err-ancien");
    const btn    = document.getElementById("btn-step1");

    _clearErr("err-ancien");

    if (!ancien) {
        _showErr("err-ancien", "Veuillez entrer votre mot de passe actuel.");
        return;
    }

    // Désactiver le bouton pendant la requête
    btn.disabled = true;
    btn.textContent = "Vérification…";

    try {
        const rep = await fetch("/verifier-admin", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ mdp: ancien })
        });

        const resultat = await rep.json();

        if (!resultat.success) {
            _showErr("err-ancien", "Mot de passe incorrect. Réessayez.");
            // Secouer le champ pour signaler l'erreur
            _secouer("ancienMdp");
            return;
        }

        // Succès → passer à l'étape 2
        _ancienMdpVerifie = true;
        _allerStep(2);
        setTimeout(() => document.getElementById("nouveauMdp").focus(), 200);

    } catch (e) {
        _showErr("err-ancien", "Erreur de connexion au serveur.");
        console.error("verifierAncienMdp :", e);
    } finally {
        btn.disabled = false;
        btn.textContent = "Continuer →";
    }
}

/* ============================================================
   ÉTAPE 2 — Valider et enregistrer le nouveau mot de passe
   ============================================================ */

async function validerNouveauMdp() {
    if (!_ancienMdpVerifie) return;   // sécurité : ne pas sauter l'étape 1

    const ancien       = document.getElementById("ancienMdp").value.trim();
    const nouveau      = document.getElementById("nouveauMdp").value;
    const confirmation = document.getElementById("confirmationMdp").value;

    _clearErr("err-nouveau");
    _clearErr("err-confirm");

    let ok = true;

    if (!nouveau) {
        _showErr("err-nouveau", "Entrez un nouveau mot de passe.");
        ok = false;
    } else if (nouveau.length < 6) {
        _showErr("err-nouveau", "Le mot de passe doit contenir au moins 6 caractères.");
        ok = false;
    } else if (nouveau === ancien) {
        _showErr("err-nouveau", "Le nouveau mot de passe doit être différent de l'ancien.");
        ok = false;
    }

    if (!confirmation) {
        _showErr("err-confirm", "Confirmez votre nouveau mot de passe.");
        ok = false;
    } else if (nouveau !== confirmation) {
        _showErr("err-confirm", "Les deux mots de passe ne correspondent pas.");
        _secouer("confirmationMdp");
        ok = false;
    }

    if (!ok) return;

    // Appel serveur
    try {
        const rep = await fetch("/modifier-admin", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ancien, nouveau })
        });

        const resultat = await rep.json();

        if (resultat.success) {
            _allerStep(3);   // Afficher l'écran de succès
        } else {
            _showErr("err-nouveau", resultat.message || "Erreur lors de la modification.");
        }

    } catch (e) {
        _showErr("err-nouveau", "Erreur de connexion au serveur.");
        console.error("validerNouveauMdp :", e);
    }
}

/* ============================================================
   RETOUR ÉTAPE 1
   ============================================================ */

function retourStep1() {
    _ancienMdpVerifie = false;
    _allerStep(1);
    _clearErr("err-nouveau");
    _clearErr("err-confirm");
    setTimeout(() => document.getElementById("ancienMdp").focus(), 150);
}

/* ============================================================
   AFFICHER / CACHER MOT DE PASSE (œil)
   ============================================================ */

function toggleVision(inputId, btn) {
    const input = document.getElementById(inputId);
    const cache = input.type === "password";
    input.type  = cache ? "text" : "password";
    btn.textContent = cache ? "🙈" : "👁";
    btn.style.opacity = cache ? "1" : "0.5";
}

/* ============================================================
   ÉVALUATION DE LA FORCE DU MOT DE PASSE
   ============================================================ */

function evaluerForce(mdp) {
    const barre  = document.getElementById("force-bar");
    const label  = document.getElementById("force-label");

    if (!mdp) {
        barre.style.width      = "0%";
        barre.style.background = "";
        label.textContent      = "";
        return;
    }

    let score = 0;
    if (mdp.length >= 6)                        score++;
    if (mdp.length >= 10)                       score++;
    if (/[A-Z]/.test(mdp))                      score++;
    if (/[0-9]/.test(mdp))                      score++;
    if (/[^A-Za-z0-9]/.test(mdp))              score++;

    const niveaux = [
        { pct: "20%",  couleur: "#ef4444", texte: "Très faible",  color: "#ef4444" },
        { pct: "40%",  couleur: "#f97316", texte: "Faible",       color: "#f97316" },
        { pct: "60%",  couleur: "#f59e0b", texte: "Moyen",        color: "#f59e0b" },
        { pct: "80%",  couleur: "#22c55e", texte: "Fort",         color: "#22c55e" },
        { pct: "100%", couleur: "#15803d", texte: "Très fort ✓",  color: "#15803d" },
    ];

    const n = niveaux[Math.min(score - 1, 4)] || niveaux[0];
    barre.style.width      = n.pct;
    barre.style.background = n.couleur;
    label.textContent      = n.texte;
    label.style.color      = n.color;
}

/* ============================================================
   HELPERS PRIVÉS
   ============================================================ */

/** Aller à une étape (1, 2, ou 3) et mettre à jour les indicateurs */
function _allerStep(num) {
    [1, 2, 3].forEach(n => {
        const stepEl = document.getElementById(`reset-step-${n}`);
        const indEl  = document.getElementById(`step-indicator-${n}`);
        if (stepEl) stepEl.style.display = (n === num) ? "block" : "none";
        if (indEl) {
            indEl.classList.remove("active", "done");
            if (n < num)       indEl.classList.add("done");
            else if (n === num) indEl.classList.add("active");
        }
    });

    // Colorier les lignes entre étapes
    document.querySelectorAll(".step-line").forEach((line, i) => {
        line.classList.toggle("done", i + 1 < num);
    });
}

/** Remettre le formulaire à zéro */
function _resetFormulaire() {
    ["ancienMdp", "nouveauMdp", "confirmationMdp"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = "";
            el.type  = "password";
        }
    });
    ["err-ancien", "err-nouveau", "err-confirm"].forEach(id => _clearErr(id));

    const barre = document.getElementById("force-bar");
    const label = document.getElementById("force-label");
    if (barre) { barre.style.width = "0%"; barre.style.background = ""; }
    if (label) { label.textContent = ""; }

    // Remettre les icônes d'œil
    document.querySelectorAll(".eye-btn").forEach(b => {
        b.textContent  = "👁";
        b.style.opacity = "0.5";
    });
}

/** Afficher un message d'erreur */
function _showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

/** Effacer un message d'erreur */
function _clearErr(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
}

/** Animation de secousse sur un input */
function _secouer(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.style.transition = "transform 0.07s";
    const seq = ["-6px", "6px", "-4px", "4px", "0px"];
    let i = 0;
    const tick = () => {
        if (i >= seq.length) { el.style.transform = ""; return; }
        el.style.transform = `translateX(${seq[i++]})`;
        setTimeout(tick, 70);
    };
    tick();
}

/* ---- Exposition globale ---- */
window.ouvrirResetMdp    = ouvrirResetMdp;
window.fermerResetMdp    = fermerResetMdp;
window.verifierAncienMdp = verifierAncienMdp;
window.validerNouveauMdp = validerNouveauMdp;
window.retourStep1       = retourStep1;
window.toggleVision      = toggleVision;
window.evaluerForce      = evaluerForce;
