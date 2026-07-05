// =========================================================================
// SanaLite RDC — Rendez-vous : logique du formulaire
// =========================================================================

let tousLesPatients = [];

// =========================================
// CENTRE COURANT (même clé que Consultation.html / script.js)
// =========================================
function getCentre() {
    const data = localStorage.getItem("centre_sante");
    if (!data) {
        return null;
    }
    try {
        const parsed = JSON.parse(data);
        return parsed.centre || null;
    } catch {
        return null;
    }
}

function getEmail() {
    const data = localStorage.getItem("centre_sante");
    if (!data) {
        return null;
    }
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
// TOGGLE MENU (identique à Consultation.html)
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

    const form = document.getElementById("form-rdv");
    const dateNaissance = document.getElementById("dateNaissance");
    const ageInput = document.getElementById("age");
    const dateRdv = document.getElementById("date");
    const medecinSelect = document.getElementById("medecin");
    const medecinAutreBox = document.getElementById("medecin-autre-box");
    const medecinAutreInput = document.getElementById("medecinAutre");
    const medecinHint = document.getElementById("medecin-hint");

    const dossierInput = document.getElementById("dossier");
    const nomInput = document.getElementById("nom");
    const sexeSelect = document.getElementById("sexe");
    const telephoneInput = document.getElementById("telephone");
    const adresseInput = document.getElementById("adresse");

    const rechercheHint = document.getElementById("rechercheHint");

    // ---------------------------------------------------------------------
    // La date du rendez-vous ne peut pas être dans le passé
    // ---------------------------------------------------------------------
    const today = new Date().toISOString().split("T")[0];
    dateRdv.min = today;

    // ---------------------------------------------------------------------
    // Calcul automatique de l'âge
    // ---------------------------------------------------------------------
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

    dateNaissance.addEventListener("change", () => {
        ageInput.value = calculerAgeDepuisDate(dateNaissance.value);
    });

    // ---------------------------------------------------------------------
    // Recherche d'un dossier patient existant
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
                rechercheHint.textContent = "Sélectionnez un patient pour remplir automatiquement ses informations, ou laissez vide pour créer un nouveau dossier.";
                rechercheHint.className = "field-hint";
            }
        } catch (e) {
            console.error(e);
            rechercheHint.textContent = "Impossible de contacter le serveur pour rechercher un dossier.";
            rechercheHint.className = "field-hint match-none";
        }
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
                Aucun patient trouvé. Vérifiez le nom ou le numéro de dossier — vous pouvez continuer pour créer un nouveau dossier.
            </div>`;
            return;
        }
        zone.style.display = "block";
        zone.innerHTML = patients.map(p => {
            const age = calculerAgeDepuisDate(p.dob);
            return `
            <div class="search-item" onclick="selectionnerPatientPourRdv('${p.dossier}')">
                <div>
                    <div class="dossier-num">📁 ${p.dossier}</div>
                    <div class="patient-info">${p.nom || ""}</div>
                    <div class="patient-age">${age || "?"} ans · ${p.sexe === "M" ? "Masculin" : "Féminin"} · ${p.adresse || "Adresse non renseignée"}</div>
                </div>
                <span class="badge badge-blue">Sélectionner →</span>
            </div>`;
        }).join("");
    }

    window.selectionnerPatientPourRdv = function (dossier) {
        const patient = tousLesPatients.find(p => p.dossier === dossier);
        if (!patient) return;

        dossierInput.value = patient.dossier || "";
        nomInput.value = patient.nom || "";
        sexeSelect.value = patient.sexe === "M" ? "Masculin" : (patient.sexe === "F" ? "Féminin" : sexeSelect.value);
        dateNaissance.value = patient.dob ? patient.dob.split("T")[0] : "";
        ageInput.value = calculerAgeDepuisDate(patient.dob);
        telephoneInput.value = patient.tel || "";
        adresseInput.value = patient.adresse || "";

        document.getElementById("searchInput").value = `${patient.dossier} — ${patient.nom || ""}`;
        document.getElementById("searchResults").style.display = "none";

        rechercheHint.textContent = `Dossier ${patient.dossier} chargé — informations remplies automatiquement.`;
        rechercheHint.className = "field-hint match-found";
    };

    chargerListePatients();

    // ---------------------------------------------------------------------
    // Liste des médecins
    // ---------------------------------------------------------------------
    function nomMedecin(m) {
        if (typeof m === "string") return m;
        if (m && typeof m === "object") return m.nom || m.name || "";
        return "";
    }

    function chargerMedecins() {
        const medecins = JSON.parse(localStorage.getItem("medecins")) || [];
        const noms = medecins.map(nomMedecin).filter(Boolean);

        medecinSelect.innerHTML = '<option value="" disabled selected>Sélectionner un médecin</option>';

        noms.forEach((nom) => {
            const option = document.createElement("option");
            option.value = nom;
            option.textContent = nom;
            medecinSelect.appendChild(option);
        });

        const autreOption = document.createElement("option");
        autreOption.value = "__autre__";
        autreOption.textContent = "Autre (préciser)";
        medecinSelect.appendChild(autreOption);

        medecinHint.textContent = noms.length === 0
            ? "Aucun médecin enregistré pour le moment — choisissez « Autre » pour saisir un nom."
            : "";
    }

    medecinSelect.addEventListener("change", () => {
        const isAutre = medecinSelect.value === "__autre__";
        medecinAutreBox.style.display = isAutre ? "flex" : "none";
        medecinAutreInput.required = isAutre;
    });

    chargerMedecins();

    // ---------------------------------------------------------------------
    // Soumission du formulaire
    // ---------------------------------------------------------------------
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            afficherToast("Veuillez remplir tous les champs obligatoires.", true);
            return;
        }

        const medecinFinal = medecinSelect.value === "__autre__"
            ? medecinAutreInput.value.trim()
            : medecinSelect.value;

        if (!medecinFinal) {
            afficherToast("Veuillez indiquer un médecin.", true);
            return;
        }

        const rendezVous = {
            id: "RDV-" + Date.now(),
            dossier: form.dossier.value.trim(),
            nom: form.nom.value.trim(),
            sexe: form.sexe.value,
            dateNaissance: form.dateNaissance.value,
            age: ageInput.value,
            telephone: form.telephone.value.trim(),
            adresse: form.adresse.value.trim(),
            date: form.date.value,
            heure: form.heure.value,
            service: form.service.value,
            medecin: medecinFinal,
            motif: form.motif.value.trim(),
            statut: form.statut.value,
            agent: form.agent.value.trim(),
            centre: getCentre() || "",
            creeLe: new Date().toISOString()
        };

        const listeRdv = JSON.parse(localStorage.getItem("rendezvous")) || [];
        listeRdv.push(rendezVous);
        localStorage.setItem("rendezvous", JSON.stringify(listeRdv));

        afficherToast("Rendez-vous enregistré avec succès.", false);
        setTimeout(() => {
            window.location.href = "liste-rendezvous.html?success=1";
        }, 600);
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