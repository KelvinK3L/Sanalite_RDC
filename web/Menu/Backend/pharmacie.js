// =========================================================================
// SanaLite RDC — Pharmacie : logique du formulaire
// =========================================================================

let tousLesPatients = [];

// =========================================
// CENTRE COURANT (même clé que Consultation.html / rendezvous.js)
// =========================================
function getCentre() {
    const data = localStorage.getItem("centre_sante");
    if (!data) return null;
    try {
        const parsed = JSON.parse(data);
        return parsed.centre || null;
    } catch {
        return null;
    }
}

function getEmail() {
    const data = localStorage.getItem("centre_sante");
    if (!data) return null;
    try {
        const parsed = JSON.parse(data);
        return parsed.email || "";
    } catch {
        return "";
    }
}

// =========================================
// DARK MODE
// =========================================
function changerMode() {
    document.body.classList.toggle("sombre");
    const btn = document.querySelector(".darkmode");
    if (document.body.classList.contains("sombre")) {
        btn.innerHTML = "☀️"; localStorage.setItem("theme", "sombre");
    } else {
        btn.innerHTML = "🌙"; localStorage.setItem("theme", "clair");
    }
}

window.addEventListener("load", () => {
    if (localStorage.getItem("theme") === "sombre") {
        document.body.classList.add("sombre");
        const btn = document.querySelector(".darkmode");
        if (btn) btn.innerHTML = "☀️";
    }
});

// =========================================
// TOGGLE MENU
// =========================================
function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const btn     = document.getElementById("menuBtn");
    if (window.innerWidth > 768) {
        sidebar.classList.toggle("hidden");
        btn.style.left = sidebar.classList.contains("hidden") ? "16px" : "270px";
        localStorage.setItem("sidebarState", sidebar.classList.contains("hidden") ? "hidden" : "open");
    } else {
        sidebar.classList.toggle("show");
        overlay.classList.toggle("active");
    }
}

// =========================================
// DÉCONNEXION
// =========================================
function deconnecter() {
    if (confirm("Voulez-vous vous déconnecter ?")) {
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        localStorage.removeItem("centre_sante");
        window.location.href = "../index.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {

    const overlay = document.getElementById("overlay");
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuBtn");

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("show");
        overlay.classList.remove("active");
    });

    if (localStorage.getItem("sidebarState") === "hidden" && window.innerWidth > 768) {
        sidebar.classList.add("hidden");
        menuBtn.style.left = "16px";
    }

    const form = document.getElementById("form-pharmacie");

    const dossierInput     = document.getElementById("pha_dossier");
    const patientInput     = document.getElementById("pha_patient");
    const ageInput         = document.getElementById("pha_age");
    const sexeSelect       = document.getElementById("pha_sexe");

    const medicamentInput  = document.getElementById("pha_medicament");
    const categorieSelect  = document.getElementById("pha_categorie");
    const quantiteInput    = document.getElementById("pha_quantite");
    const prixInput        = document.getElementById("pha_prix");
    const totalInput       = document.getElementById("pha_total");
    const dateInput        = document.getElementById("pha_date");

    const prescriptionArea = document.getElementById("pha_prescription");

    const modeSelect       = document.getElementById("pha_mode");
    const payeInput        = document.getElementById("pha_paye");
    const resteInput       = document.getElementById("pha_reste");

    const rechercheHint    = document.getElementById("rechercheHint");

    // Date de délivrance par défaut = aujourd'hui
    dateInput.value = new Date().toISOString().split("T")[0];

    // ---------------------------------------------------------------------
    // Calculs automatiques : montant total, puis reste à payer
    // ---------------------------------------------------------------------
    function calculerTotal() {
        const qte = Number(quantiteInput.value) || 0;
        const pu  = Number(prixInput.value) || 0;
        totalInput.value = (qte * pu).toFixed(2);
        calculerReste();
    }

    function calculerReste() {
        const total = Number(totalInput.value) || 0;
        const paye  = Number(payeInput.value) || 0;
        resteInput.value = (total - paye).toFixed(2);
    }

    quantiteInput.addEventListener("input", calculerTotal);
    prixInput.addEventListener("input", calculerTotal);
    payeInput.addEventListener("input", calculerReste);

    // ---------------------------------------------------------------------
    // Recherche d'un patient existant
    // ---------------------------------------------------------------------
    async function chargerListePatients() {
        const centre = getCentre();
        if (!centre) {
            rechercheHint.textContent = "Centre introuvable — veuillez vous reconnecter pour rechercher un dossier existant.";
            rechercheHint.className = "field-hint match-none";
            return;
        }
        try {
            const rep = await fetch(`/patients?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(getEmail())}`);
            const patients = await rep.json();
            if (Array.isArray(patients)) {
                tousLesPatients = patients;
                rechercheHint.textContent = "Sélectionnez un patient pour remplir automatiquement ses informations, ou laissez vide pour une vente sans dossier.";
                rechercheHint.className = "field-hint";
            }
        } catch (e) {
            console.error(e);
            rechercheHint.textContent = "Impossible de contacter le serveur pour rechercher un dossier.";
            rechercheHint.className = "field-hint match-none";
        }
    }

    function calculerAgeDepuisDate(dateStr) {
        if (!dateStr) return "";
        const naissance = new Date(dateStr);
        const now = new Date();
        let age = now.getFullYear() - naissance.getFullYear();
        const moisDiff = now.getMonth() - naissance.getMonth();
        if (moisDiff < 0 || (moisDiff === 0 && now.getDate() < naissance.getDate())) {
            age--;
        }
        return age >= 0 ? age : "";
    }

    window.rechercherPatient = function (valeur) {
        const zone = document.getElementById("searchResults");
        if (!valeur || valeur.length < 2) {
            zone.style.display = "none";
            return;
        }
        const v = valeur.toLowerCase();
        const resultats = tousLesPatients.filter(p =>
            (p.dossier || "").toLowerCase().includes(v) ||
            (p.nom || "").toLowerCase().includes(v)
        );
        afficherResultats(resultats);
    };

    function afficherResultats(patients) {
        const zone = document.getElementById("searchResults");
        if (!patients || patients.length === 0) {
            zone.style.display = "block";
            zone.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text2); font-size:13px;">
                Aucun patient trouvé. Vérifiez le nom ou le numéro de dossier.
            </div>`;
            return;
        }
        zone.style.display = "block";
        zone.innerHTML = patients.map(p => {
            const age = calculerAgeDepuisDate(p.dob);
            return `
            <div class="search-item" onclick="selectionnerPatientPourPharmacie('${p.dossier}')">
                <div>
                    <div class="dossier-num">📁 ${p.dossier}</div>
                    <div class="patient-info">${p.nom || ""}</div>
                    <div class="patient-age">${age || "?"} ans · ${p.sexe === "M" ? "Masculin" : "Féminin"}</div>
                </div>
                <span class="badge badge-blue">Sélectionner →</span>
            </div>`;
        }).join("");
    }

    window.selectionnerPatientPourPharmacie = function (dossier) {
        const patient = tousLesPatients.find(p => p.dossier === dossier);
        if (!patient) return;

        dossierInput.value = patient.dossier || "";
        patientInput.value = patient.nom || "";
        ageInput.value = calculerAgeDepuisDate(patient.dob);
        sexeSelect.value = patient.sexe === "M" ? "Masculin" : (patient.sexe === "F" ? "Féminin" : sexeSelect.value);

        document.getElementById("searchInput").value = `${patient.dossier} — ${patient.nom || ""}`;
        document.getElementById("searchResults").style.display = "none";

        rechercheHint.textContent = `Dossier ${patient.dossier} chargé — informations remplies automatiquement.`;
        rechercheHint.className = "field-hint match-found";
    };

    chargerListePatients();

    // ---------------------------------------------------------------------
    // Soumission du formulaire
    // ---------------------------------------------------------------------
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!medicamentInput.value.trim()) {
            afficherToast("Veuillez indiquer le nom du médicament.", true);
            medicamentInput.focus();
            return;
        }

        const vente = {
            id: "VENTE-" + Date.now(),
            dossier: dossierInput.value.trim(),
            patient: patientInput.value.trim(),
            age: ageInput.value,
            sexe: sexeSelect.value,
            medicament: medicamentInput.value.trim(),
            categorie: categorieSelect.value,
            quantite: quantiteInput.value,
            prix: prixInput.value,
            total: totalInput.value,
            date: dateInput.value,
            prescription: prescriptionArea.value.trim(),
            modePaiement: modeSelect.value,
            montantPaye: payeInput.value,
            resteAPayer: resteInput.value,
            centre: getCentre() || "",
            creeLe: new Date().toISOString()
        };

        const ventes = JSON.parse(localStorage.getItem("ventes_pharmacie")) || [];
        ventes.push(vente);
        localStorage.setItem("ventes_pharmacie", JSON.stringify(ventes));

        afficherToast("Vente enregistrée avec succès.", false);
    });

    // ---------------------------------------------------------------------
    // Toast de notification
    // ---------------------------------------------------------------------
    function afficherToast(message, isError) {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.classList.toggle("error", !!isError);
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3200);
    }

});