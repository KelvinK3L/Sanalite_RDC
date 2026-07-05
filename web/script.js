// =========================
// UTILITAIRE : récupérer le centre connecté
// =========================
function getCentre() {
    const data = localStorage.getItem("centre_sante");
    if (!data) return "";
    try {
        return JSON.parse(data).centre || "";
    } catch {
        return "";
    }
}

function getEmail() {
    const data = localStorage.getItem("centre_sante");
    if (!data) return "";
    try {
        return JSON.parse(data).email || "";
    } catch {
        return "";
    }
}


// =========================
// INSCRIPTION
// =========================
function inscrire() {
    let admin   = document.getElementById("nom_admin").value.trim();
    let centre  = document.getElementById("nom_centre").value.trim();
    let email   = document.getElementById("adress_email").value.trim();
    let mdp     = document.getElementById("mot_de_passe").value.trim();
    let service = document.getElementById("service").value.trim();
    let serveur = document.getElementById("nom_serveur").value.trim();

    if (!admin || !centre || !email || !mdp || !serveur) {
        alert("Veuillez remplir tous les champs !");
        return;
    }
    if (service === "Quel est votre service") {
        alert("Veuillez sélectionner votre service !");
        return;
    }

    let data = { admin, centre, email, mdp, service, serveur };

    fetch("/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) {
            localStorage.setItem("centre_sante", JSON.stringify({ centre, email }));
            localStorage.setItem("role", service);
            localStorage.setItem("user", admin);
            alert("Inscription réussie !");
            window.location.href = "dashboard.html";
        } else {
            alert("Erreur : " + (result.message || "Inscription échouée"));
        }
    })
    .catch(err => {
        console.error(err);
        alert("Erreur serveur !");
    });
}


// =========================
// CONNEXION
// =========================
function connecter() {
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("centre_sante");

    let admin   = document.getElementById("nom_admin").value.trim();
    let centre  = document.getElementById("nom_centre").value.trim();
    let email   = document.getElementById("adress_email").value.trim();
    let mdp     = document.getElementById("mot_de_passe").value.trim();
    let service = document.getElementById("service").value.trim();
    let serveur = document.getElementById("nom_serveur").value.trim();

    if (!admin || !centre || !email || !mdp || !serveur) {
        alert("Veuillez remplir tous les champs !");
        return;
    }
    if (service === "Quel est votre service") {
        alert("Veuillez sélectionner votre service !");
        return;
    }

    let data = { admin, centre, email, mdp, service, serveur };

    fetch("/connexion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) {
            localStorage.setItem("role",         service);
            localStorage.setItem("user",         admin);
            localStorage.setItem("centre_sante", JSON.stringify({ centre, email }));
            alert("Connexion réussie !");
            window.location.href = "dashboard.html";
        } else {
            alert("❌ " + (result.message || "Connexion échouée"));
        }
    })
    .catch(err => {
        console.error(err);
        alert("Erreur serveur !");
    });
}


// =========================
// PERSONNEL — toujours passer ?centre=xxx
// =========================
function chargerPersonnel() {
    const centre = getCentre();
    if (!centre) return;

    const email = getEmail();
    fetch(`/personnel?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => afficherPersonnel(data))
        .catch(err => console.error("Erreur chargement personnel :", err));
}

function ajouterPersonnel(membreData) {
    const centre = getCentre();
    membreData.centre = centre;   // ← injecter le centre

    const email = getEmail();
    fetch("/personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...membreData, email })
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) chargerPersonnel();
        else alert("Erreur : " + result.message);
    });
}

function togglePresence(index) {
    const centre = getCentre();
    const email = getEmail();
    fetch(`/personnel/toggle/${index}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centre, email })
    })
    .then(r => r.json())
    .then(() => chargerPersonnel());
}

function justifierAbsence(index) {
    const centre = getCentre();
    const email = getEmail();
    fetch(`/personnel/justifier/${index}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centre, email })
    })
    .then(r => r.json())
    .then(() => chargerPersonnel());
}

function supprimerPersonnel(index) {
    const centre = getCentre();
    const email = getEmail();
    fetch(`/personnel/${index}?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(email)}`, {
        method: "DELETE"
    })
    .then(r => r.json())
    .then(() => chargerPersonnel());
}


// =========================
// PATIENTS — toujours passer ?centre=xxx
// =========================
function chargerPatients() {
    const centre = getCentre();
    if (!centre) return;

    const email = getEmail();
    fetch(`/patients?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => afficherPatients(data))
        .catch(err => console.error("Erreur chargement patients :", err));
}

function ajouterPatient(patientData) {
    const centre = getCentre();
    patientData.centre = centre;

    const email = getEmail();
    fetch("/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patientData, email })
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) {
            alert("Patient ajouté — Dossier : " + result.dossier);
            chargerPatients();
        } else {
            alert("Erreur : " + result.message);
        }
    });
}

function supprimerPatient(dossier) {
    const centre = getCentre();
    const email = getEmail();
    fetch(`/patients/${dossier}?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(email)}`, {
        method: "DELETE"
    })
    .then(r => r.json())
    .then(() => chargerPatients());
}


// =========================
// HISTORIQUE — toujours passer ?centre=xxx
// =========================
function chargerHistorique() {
    const centre = getCentre();
    if (!centre) return;

    const email = getEmail();
    fetch(`/historique?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => afficherHistorique(data))
        .catch(err => console.error("Erreur chargement historique :", err));
}

function sauvegarderHistorique(entree) {
    const centre = getCentre();
    entree.centre = centre;

    const email = getEmail();
    fetch("/historique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entree, email })
    });
}


// =========================
// MODE SOMBRE
// =========================
window.onload = function () {
    let mode = localStorage.getItem("theme");
    if (mode === "sombre") {
        document.body.classList.add("sombre");
        const btn = document.querySelector(".darkmode");
        if (btn) btn.innerHTML = "☀️";
    }
};

function changerMode() {
    document.body.classList.toggle("sombre");
    let bouton = document.querySelector(".darkmode");
    if (document.body.classList.contains("sombre")) {
        bouton.innerHTML = "☀️";
        localStorage.setItem("theme", "sombre");
    } else {
        bouton.innerHTML = "🌙";
        localStorage.setItem("theme", "clair");
    }
}