
// =========================
// INSCRIPTION
// =========================
function inscrire() {

    let admin = document.getElementById("nom_admin").value.trim();
    let centre = document.getElementById("nom_centre").value.trim();
    let email = document.getElementById("adress_email").value.trim();
    let mdp = document.getElementById("mot_de_passe").value.trim();
    let service = document.getElementById("service").value.trim();
    let serveur = document.getElementById("nom_serveur").value.trim();

    if (!admin || !centre || !email || !mdp || !service || !serveur) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    let data = {
        admin: admin,
        centre: centre,
        email: email,
        mdp: mdp,
        service: service,
        serveur: serveur
    };

    localStorage.setItem("centre_sante", JSON.stringify(data));

    alert("Inscription réussie !");
    window.location.href = "dashboard.html"; // retour login
}



// =========================
// CONNEXION
// =========================
function connecter() {

    let admin = document.getElementById("nom_admin").value.trim();
    let centre = document.getElementById("nom_centre").value.trim();
    let email = document.getElementById("adress_email").value.trim();
    let mdp = document.getElementById("mot_de_passe").value.trim();
    let service = document.getElementById("service").value;
    let serveur = document.getElementById("nom_serveur").value.trim();

    let data = JSON.parse(localStorage.getItem("centre_sante"));

    if (!admin || !centre || !email || !mdp || !service || !serveur) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    if (!data) {
        alert("Aucun compte trouvé !");
        return;
    }

    if (
        admin === data.admin &&
        centre === data.centre &&
        email === data.email &&
        mdp === data.mdp &&
        serveur === data.serveur &&
        service === data.service
    ) {
        localStorage.setItem("role", service);
        localStorage.setItem("user", admin);

        alert("Connexion réussie !");
        window.location.href = "dashboard.html";
    } else {
        alert("Informations incorrectes !");
    }
}

// =========================
// MODE SOMBRE
// =========================

// Vérifie le mode au chargement

window.onload = function(){

    let mode = localStorage.getItem("theme");

    if(mode === "sombre"){

        document.body.classList.add("sombre");

        document.querySelector(".darkmode").innerHTML = "☀️";
    }
};



// Changer le mode

function changerMode(){

    document.body.classList.toggle("sombre");

    let bouton = document.querySelector(".darkmode");


    // Si mode sombre activé

    if(document.body.classList.contains("sombre")){

        bouton.innerHTML = "☀️";

        localStorage.setItem("theme", "sombre");

    }else{

        bouton.innerHTML = "🌙";

        localStorage.setItem("theme", "clair");
    }
}

// =========================
// Permissions et rôles
// =========================
function Permissions() {
    const role = (localStorage.getItem("role") || "").toLowerCase();

    const sections = {
        admin: ["admin-section", "medecin-section", "infirmier-section"],
        medecin: ["medecin-section"],
        infirmier: ["infirmier-section"],
        receptionniste: [],
        laboratoire: [],
        technicien: [],
        pharmacien: [],
        comptable: [],
        urgence: []
    };

    // cacher tout d'abord
    document.querySelectorAll(".section").forEach(sec => {
        sec.style.display = "none";
    });

    if (!sections.hasOwnProperty(role)) {
        alert("Rôle inconnu !");
        return;
    }

    // afficher seulement les sections autorisées
    sections[role].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "block";
    });
}