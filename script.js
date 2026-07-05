// ===============================
// DONNEES DU DASHBOARD
// ===============================

let nombrePatients = 1280;
let nombreMedecins = 45;
let nombreUrgences = 8;
let revenus = 12450;

// ===============================
// AFFICHAGE DES STATS
// ===============================

function chargerDashboard() {

    document.getElementById("patients").innerHTML =
        nombrePatients;

    document.getElementById("medecins").innerHTML =
        nombreMedecins;

    document.getElementById("urgences").innerHTML =
        nombreUrgences;

    document.getElementById("revenus").innerHTML =
        revenus + " $";
}

// ===============================
// AJOUT PATIENT
// ===============================

function ajouterPatient() {

    let nom = prompt("Nom du patient :");

    if(nom == null || nom == ""){
        return;
    }

    let age = prompt("Âge :");

    let service = prompt("Service :");

    let status = prompt("Status :");

    // TABLE
    let table = document.getElementById("tablePatients");

    let ligne = table.insertRow(-1);

    let col1 = ligne.insertCell(0);
    let col2 = ligne.insertCell(1);
    let col3 = ligne.insertCell(2);
    let col4 = ligne.insertCell(3);

    col1.innerHTML = nom;
    col2.innerHTML = age;
    col3.innerHTML = service;

    // STATUS STYLE
    if(status.toLowerCase() == "stable"){

        col4.innerHTML =
            `<span class="ok">${status}</span>`;

    }else if(status.toLowerCase() == "critique"){

        col4.innerHTML =
            `<span class="danger">${status}</span>`;

    }else{

        col4.innerHTML =
            `<span class="wait">${status}</span>`;
    }

    // AUGMENTER NOMBRE PATIENTS
    nombrePatients++;

    document.getElementById("patients").innerHTML =
        nombrePatients;

    ajouterActivite(
        "🟢 Nouveau patient ajouté : " + nom
    );
}

// ===============================
// ACTIVITES
// ===============================

function ajouterActivite(message){

    let activity =
        document.querySelector(".activity");

    let div = document.createElement("div");

    div.classList.add("act");

    div.innerHTML = `
        <p>${message}</p>
        <span>À l'instant</span>
    `;

    activity.appendChild(div);
}

// ===============================
// ACTUALISATION AUTOMATIQUE
// ===============================

function simulationTempsReel(){

    // urgences aléatoires
    nombreUrgences =
        Math.floor(Math.random() * 15);

    document.getElementById("urgences").innerHTML =
        nombreUrgences;

    // revenus
    revenus += Math.floor(Math.random() * 500);

    document.getElementById("revenus").innerHTML =
        revenus + " $";
}

// ===============================
// DEMARRAGE
// ===============================

chargerDashboard();

// actualiser chaque 5 secondes
setInterval(simulationTempsReel, 5000);