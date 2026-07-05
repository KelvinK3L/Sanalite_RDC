// =========================
// UTILITAIRE : récupérer le centre connecté
// =========================
function getCentre() {
    try {
        const data = localStorage.getItem("centre_sante");
        return data ? JSON.parse(data).centre || "" : "";
    } catch {
        return "";
    }
}

function getEmail() {
    try {
        const data = localStorage.getItem("centre_sante");
        return data ? JSON.parse(data).email || "" : "";
    } catch {
        return "";
    }
}

// =========================
// MODE SOMBRE
// =========================
(function () {
    if (localStorage.getItem("theme") === "sombre") {
        document.body.classList.add("sombre");
    }
})();

window.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".darkmode");
    if (btn) btn.innerHTML = localStorage.getItem("theme") === "sombre" ? "☀️" : "🌙";
});

function changerMode() {
    document.body.classList.toggle("sombre");
    const btn = document.querySelector(".darkmode");
    const estSombre = document.body.classList.contains("sombre");
    if (btn) btn.innerHTML = estSombre ? "☀️" : "🌙";
    localStorage.setItem("theme", estSombre ? "sombre" : "clair");
}

// =========================
// INITIALISATION
// =========================
document.addEventListener("DOMContentLoaded", () => {
    let role = localStorage.getItem("role");
    if (!role) {
        window.location.href = "../index.html";
        return;
    }
    afficherMedecins();
    chargerDashboard();
    sauvegarderSnapshot();
});

// =========================
// DÉCONNEXION
// =========================
function deconnecter() {
    if (confirm("Voulez-vous vous déconnecter ?")) {
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        localStorage.removeItem("centre_sante");
        window.location.href = "../index.html";
    }
}

// =========================
// AFFICHER PERSONNEL
// =========================
async function afficherMedecins() {
    const centre = getCentre();
    if (!centre) {
        console.warn("⚠ Centre manquant — reconnectez-vous.");
        document.getElementById("listeMedecins").innerHTML =
            "<p style='color:red;text-align:center;padding:20px'>Session expirée. <a href='../index.html'>Se reconnecter</a></p>";
        return;
    }

    try {
        let rep       = await fetch(`/personnel?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(getEmail())}`);
        let personnel = await rep.json();

        // Sécurité : vérifier que c'est bien un tableau
        if (!Array.isArray(personnel)) {
            console.error("❌ Réponse inattendue :", personnel);
            return;
        }

        renderPersonnel(personnel);
        updateDashboard(personnel);
        updateGraphFromPersonnel(personnel);
    } catch (e) {
        console.error("Erreur affichage personnel :", e);
    }
}

// =========================
// ENREGISTRER UN EMPLOYÉ
// =========================
async function ajouterMedecin() {
    const centre = getCentre();
    if (!centre) { alert("Session expirée, reconnectez-vous."); return; }

    let nom        = document.getElementById("nom").value.trim();
    let fonction   = document.getElementById("fonction").value;
    let specialite = document.getElementById("specialite").value.trim();
    let experience = document.getElementById("experience").value;

    if (!nom || !fonction || !specialite || !experience) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    try {
        let rep = await fetch("/personnel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nom, fonction, specialite, experience, statut: "absent", centre, email: getEmail() })
        });

        let resultat = await rep.json();

        if (resultat.success) {
            alert("✅ Employé enregistré avec succès.");
            afficherMedecins();
            document.getElementById("nom").value        = "";
            document.getElementById("fonction").value   = "";
            document.getElementById("specialite").value = "";
            document.getElementById("experience").value = "";
        } else {
            alert("❌ Erreur : " + (resultat.message || "Enregistrement échoué"));
        }
    } catch(e) {
        console.error("Erreur ajout :", e);
        alert("Erreur serveur !");
    }
}

// =========================
// SUPPRIMER UN EMPLOYÉ
// =========================
async function supprimerPersonnel(index) {
    const centre = getCentre();
    if (!centre) return;
    if (!confirm("Supprimer cet employé ?")) return;

    try {
        let rep      = await fetch(`/personnel/${index}?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(getEmail())}`, { method: "DELETE" });
        let resultat = await rep.json();
        if (resultat.success) afficherMedecins();
        else alert("Erreur suppression : " + resultat.message);
    } catch(e) {
        console.error("Erreur suppression :", e);
    }
}

// =========================
// CHANGER LA PRÉSENCE
// =========================
async function changerPresence(index) {
    const centre = getCentre();
    if (!centre) return;

    try {
        let rep = await fetch(`/personnel/toggle/${index}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ centre, email: getEmail() })
        });
        let resultat = await rep.json();
        if (resultat.success) afficherMedecins();
        else alert("Erreur présence : " + resultat.message);
    } catch(e) {
        console.error("Erreur toggle :", e);
    }
}

// =========================
// JUSTIFIER UNE ABSENCE
// =========================
async function justifierAbsence(index) {
    const centre = getCentre();
    if (!centre) return;

    try {
        let rep = await fetch(`/personnel/justifier/${index}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ centre, email: getEmail() })
        });
        let resultat = await rep.json();
        if (resultat.success) afficherMedecins();
        else alert("Erreur justification : " + resultat.message);
    } catch(e) {
        console.error("Erreur justification :", e);
    }
}

// =========================
// RENDU DU PERSONNEL
// =========================
function renderPersonnel(personnel) {
    let zone = document.getElementById("listeMedecins");
    if (!zone) return;

    // Compteur
    const compteur = document.getElementById("compteurListe");
    if (compteur) compteur.textContent = `${personnel.length} employé(s)`;

    if (!Array.isArray(personnel) || personnel.length === 0) {
        zone.innerHTML = "<p style='text-align:center;padding:20px;color:var(--text2)'>Aucun employé enregistré.</p>";
        return;
    }

    let html = "";
    personnel.forEach((m, index) => {
        let statut  = m.statut || "absent";
        let couleur = statut === "present"  ? "var(--green)"
                    : statut === "justifie" ? "var(--orange)" : "var(--red)";
        let texte   = statut === "present"  ? "🟢 Présent"
                    : statut === "justifie" ? "🟡 Absence justifiée"
                    : "🔴 Absent";

        html += `
        <div class="medecin">
            <div>
                <strong>${m.nom}</strong>
                <div class="info">${m.fonction} — ${m.specialite} — ${m.experience} an(s)</div>
                <div class="statut" style="color:${couleur}">${texte}</div>
            </div>
            <div class="actions">
                <button class="btn-presence" onclick="changerPresence(${index})">
                    ${statut === "present" ? "Marquer absent" : "Marquer présent"}
                </button>
                <button class="btn-justifier" onclick="justifierAbsence(${index})">
                    Justifier absence
                </button>
                <button class="btn-supprimer" onclick="supprimerPersonnel(${index})">
                    Supprimer
                </button>
            </div>
        </div>`;
    });

    zone.innerHTML = html;
}

// =========================
// DASHBOARD STATS
// =========================
async function chargerDashboard() {
    const centre = getCentre();
    if (!centre) return;

    try {
        let rep      = await fetch(`/personnel?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(getEmail())}`);
        let medecins = await rep.json();
        if (Array.isArray(medecins)) updateDashboard(medecins);
    } catch (e) {
        console.error("Erreur Dashboard :", e);
    }
}

function updateDashboard(medecins) {
    if (!Array.isArray(medecins)) return;
    let presents  = medecins.filter(m => m.statut === "present").length;
    let justifies = medecins.filter(m => m.statut === "justifie").length;
    let absents   = medecins.filter(m => m.statut === "absent").length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("totalPersonnel",    medecins.length);
    set("personnelPresent",  presents);
    set("personnelAbsent",   absents);
    set("personnelJustifie", justifies);
}

// =========================
// GRAPHIQUE
// =========================
function updateGraphFromPersonnel(personnel) {
    if (!Array.isArray(personnel)) return;
    let presents  = personnel.filter(p => p.statut === "present").length;
    let absents   = personnel.filter(p => p.statut === "absent").length;
    let justifies = personnel.filter(p => p.statut === "justifie").length;
    if (typeof createPresenceGraph === "function") {
        createPresenceGraph(presents, absents, justifies);
    }
}

// =========================
// RECHERCHE
// =========================
function rechercherPersonnel() {
    let texte  = document.getElementById("recherche").value.toLowerCase();
    let cartes = document.querySelectorAll(".medecin");
    cartes.forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(texte) ? "flex" : "none";
    });
}

// =========================
// SNAPSHOT HISTORIQUE
// =========================
async function sauvegarderSnapshot() {
    const centre = getCentre();
    if (!centre) return;

    try {
        let rep  = await fetch(`/personnel?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(getEmail())}`);
        let data = await rep.json();
        if (!Array.isArray(data)) return;

        let snapshot = {
            centre,
            date:      new Date().toISOString().split("T")[0],
            total:     data.length,
            presents:  data.filter(p => p.statut === "present").length,
            absents:   data.filter(p => p.statut === "absent").length,
            justifies: data.filter(p => p.statut === "justifie").length,
            personnel: data
        };

        await fetch("/historique", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ...snapshot, email: getEmail() })
        });

    } catch (e) {
        console.error("Erreur snapshot :", e);
    }
}

// =========================
// POPUP HISTORIQUE
// =========================
function ouvrirHistorique() {
    document.getElementById("popupHistorique").style.display   = "flex";
    document.getElementById("loginHistorique").style.display   = "block";
    document.getElementById("contenuHistorique").style.display = "none";
    document.getElementById("mdpHistorique").value = "";
    const errEl = document.getElementById("erreurMdp");
    if (errEl) errEl.textContent = "";
    setTimeout(() => document.getElementById("mdpHistorique").focus(), 200);
}

function ouvrirConnexionHistorique() { ouvrirHistorique(); }

function fermerHistorique() {
    document.getElementById("popupHistorique").style.display   = "none";
    document.getElementById("loginHistorique").style.display   = "block";
    document.getElementById("contenuHistorique").style.display = "none";
    document.getElementById("mdpHistorique").value = "";
    const errEl = document.getElementById("erreurMdp");
    if (errEl) errEl.textContent = "";
}

// =========================
// VÉRIFICATION MDP ADMIN
// =========================
async function verifierHistorique() {
    const mdp   = document.getElementById("mdpHistorique").value.trim();
    const errEl = document.getElementById("erreurMdp");
    const btn   = document.querySelector("#loginHistorique button");

    if (errEl) errEl.textContent = "";
    if (!mdp) { if (errEl) errEl.textContent = "⚠ Veuillez entrer le mot de passe."; return; }
    if (btn)  { btn.disabled = true; btn.textContent = "Vérification…"; }

    try {
        const rep    = await fetch("/verifier-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mdp })
        });
        const result = await rep.json();

        if (!result.success) {
            if (errEl) errEl.textContent = "❌ Mot de passe incorrect.";
            const input = document.getElementById("mdpHistorique");
            input.style.borderColor = "#dc2626";
            setTimeout(() => { input.style.borderColor = ""; }, 1500);
            return;
        }

        document.getElementById("loginHistorique").style.display   = "none";
        document.getElementById("contenuHistorique").style.display = "block";
        chargerHistorique();

    } catch (e) {
        console.error("Erreur /verifier-admin :", e);
        if (errEl) errEl.textContent = "❌ Impossible de contacter le serveur.";
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "🔓 Accéder à l'historique"; }
    }
}

// =========================
// CHARGER HISTORIQUE
// =========================
async function chargerHistorique() {
    const centre = getCentre();
    if (!centre) return;

    try {
        let rep  = await fetch(`/historique?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(getEmail())}`);
        let data = await rep.json();

        const tbody = document.getElementById("tableHistorique");
        if (!tbody) return;

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">Aucun historique disponible.</td></tr>`;
            return;
        }

        let html = "";
        data.forEach((j, i) => {
            let dateAffichage = j.date ? j.date.split("-").reverse().join("/") : "—";
            let rowId = "detail-" + i;
            html += `
            <tr data-row="${rowId}">
                <td>${dateAffichage}</td>
                <td>${j.total}</td>
                <td style="color:green;font-weight:bold;">${j.presents}</td>
                <td style="color:orange;font-weight:bold;">${j.justifies}</td>
                <td style="color:red;font-weight:bold;">${j.absents}</td>
                <td><button class="btn-detail" onclick="afficherDetailJour(${i})">👁 Voir</button></td>
            </tr>`;
        });

        tbody.innerHTML = html;
        window._historiqueData = data;

    } catch (e) {
        console.error("Erreur chargement historique :", e);
    }
}

// =========================
// DÉTAIL JOUR
// =========================
function afficherDetailJour(index) {
    let j = window._historiqueData[index];
    if (!j || !Array.isArray(j.personnel)) return;

    let rowId    = "detail-" + index;
    let existing = document.getElementById(rowId);
    if (existing) { existing.closest("tr").remove(); return; }

    let personnel = j.personnel;
    let presents  = personnel.filter(p => p.statut === "present");
    let justifies = personnel.filter(p => p.statut === "justifie");
    let absents   = personnel.filter(p => p.statut === "absent");

    function cartes(liste) {
        return liste.map(p => {
            let texte = p.statut === "present"  ? "🟢 Présent"
                      : p.statut === "justifie" ? "🟡 Justifié"
                      : "🔴 Absent";
            return `
            <div class="staff-card ${p.statut}">
                <div class="staff-name">${p.nom}</div>
                <div class="staff-role">${p.fonction}${p.specialite ? " · " + p.specialite : ""}</div>
                <span class="badge">${texte}</span>
            </div>`;
        }).join("");
    }

    let html = `<div id="${rowId}" class="detail-inner-wrapper">`;
    if (presents.length)  html += `<div class="detail-group"><h4>🟢 Présents (${presents.length})</h4><div class="staff-grid">${cartes(presents)}</div></div>`;
    if (justifies.length) html += `<div class="detail-group"><h4>🟡 Justifiés (${justifies.length})</h4><div class="staff-grid">${cartes(justifies)}</div></div>`;
    if (absents.length)   html += `<div class="detail-group"><h4>🔴 Absents (${absents.length})</h4><div class="staff-grid">${cartes(absents)}</div></div>`;
    html += `</div>`;

    let mainRow   = document.querySelector(`[data-row="${rowId}"]`);
    let detailRow = document.createElement("tr");
    detailRow.className = "detail-row";
    detailRow.innerHTML = `<td colspan="6">${html}</td>`;
    mainRow.after(detailRow);
}

// =========================
// POPUP RESET MDP
// =========================
function ouvrirResetMdp() {
    if (typeof window._ouvrirResetMdp === "function") window._ouvrirResetMdp();
    else document.getElementById("popupResetMdp").style.display = "flex";
}
function fermerResetMdp() {
    document.getElementById("popupResetMdp").style.display = "none";
}

// =========================
// SOCKET.IO — écoute par centre
// =========================
try {
    const socket = io();
    socket.on("connect", () => console.log("✅ Socket connecté :", socket.id));
    socket.on("connect_error", (err) => console.warn("⚠ Socket non disponible"));

    const _centreSocket = getCentre().trim().toLowerCase();
    const _emailSocket  = getEmail().trim().toLowerCase().replace(/[^\w\-]/g, "_");
    if (_centreSocket && _emailSocket) {
        socket.on(`update_personnel_${_centreSocket}_${_emailSocket}`, (data) => {
            if (Array.isArray(data)) {
                renderPersonnel(data);
                updateDashboard(data);
                updateGraphFromPersonnel(data);
            }
        });
    }
} catch(e) {
    console.warn("Socket.IO non disponible :", e.message);
}