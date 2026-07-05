// =========================
// UTILITAIRE
// =========================
function getCentre() {
    try {
        const data = localStorage.getItem("centre_sante");
        return data ? JSON.parse(data).centre || "" : "";
    } catch { return ""; }
}

function getEmail() {
    try {
        const data = localStorage.getItem("centre_sante");
        return data ? JSON.parse(data).email || "" : "";
    } catch { return ""; }
}

// =========================
// MODE SOMBRE
// =========================
(function () {
    if (localStorage.getItem("theme") === "sombre") document.body.classList.add("sombre");
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
// DÉCONNEXION
// =========================
function deconnecter() {
    if (confirm("Voulez-vous vous déconnecter ?")) {
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        localStorage.removeItem("centre_sante");
        window.location.href = "index.html";
    }
}

// =========================
// PATIENTS
// =========================
function chargerPatients() {
    const centre = getCentre();
    if (!centre) return;

    fetch(`/patients?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(getEmail())}`)
        .then(r => r.json())
        .then(patients => {
            if (!Array.isArray(patients)) return;
            const el      = document.getElementById("patients");
            const elDispo = document.getElementById("patientDispo");
            if (el)      el.textContent     = patients.length;
            if (elDispo) elDispo.textContent = patients.length + " enregistré(s)";
        })
        .catch(err => console.error("Erreur patients :", err));
}

// =========================
// PERSONNEL
// =========================
function chargerMedecins() {
    const centre = getCentre();
    if (!centre) return;

    fetch(`/personnel?centre=${encodeURIComponent(centre)}&email=${encodeURIComponent(getEmail())}`)
        .then(r => r.json())
        .then(personnel => {
            if (!Array.isArray(personnel)) return;
            const total       = personnel.length;
            const disponibles = personnel.filter(p => p.statut === "present").length;

            const elTotal = document.getElementById("medecins");
            const elDispo = document.getElementById("medecinsDispo");

            if (elTotal) elTotal.textContent = total;
            if (elDispo) {
                elDispo.textContent = disponibles + " disponible(s)";
                elDispo.style.color = disponibles === 0       ? "#dc2626"
                                    : disponibles < total / 2 ? "#f59e0b"
                                    : "#16a34a";
            }
        })
        .catch(err => console.error("Erreur personnel :", err));
}

// =========================
// DASHBOARD INIT
// =========================
function chargerDashboard() {
    chargerPatients();
    chargerMedecins();
}