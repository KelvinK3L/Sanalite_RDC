// ===================================
// NUMERO DOSSIER AUTOMATIQUE
// ===================================

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

function genererNumero() {

    fetch(`/patients?centre=${encodeURIComponent(getCentre())}&email=${encodeURIComponent(getEmail())}`)
    .then(response => response.json())
    .then(data => {

        let numero = data.length + 1;

        document.getElementById("dossier").value =
            "PAT-" + String(numero).padStart(2, "0");

    })
    .catch(() => {

        document.getElementById("dossier").value =
            "PAT-01";

    });

}

// ===================================
// CALCUL AGE
// ===================================

function calculerAge() {

    let naissance =
        document.getElementById("naissance").value;

    if (!naissance) return;

    let dateNaissance = new Date(naissance);
    let aujourdhui = new Date();

    let age =
        aujourdhui.getFullYear()
        - dateNaissance.getFullYear();

    let mois =
        aujourdhui.getMonth()
        - dateNaissance.getMonth();

    if (
        mois < 0 ||
        (
            mois === 0 &&
            aujourdhui.getDate() <
            dateNaissance.getDate()
        )
    ) {
        age--;
    }

    document.getElementById("age").value = age;
}

document
.getElementById("naissance")
.addEventListener("change", calculerAge);

// ===================================
// ENREGISTREMENT PATIENT
// ===================================

document
.getElementById("formPatient")
.addEventListener("submit", async function(e) {

    e.preventDefault();

    let patient = {

        centre: getCentre(),
        dossier:
            document.getElementById("dossier").value,

        nom:
            document.getElementById("nom").value,

        postnom:
            document.getElementById("postnom").value,

        prenom:
            document.getElementById("prenom").value,

        sexe:
            document.getElementById("sexe").value,

        naissance:
            document.getElementById("naissance").value,

        age:
            document.getElementById("age").value,

        etatCivil:
            document.getElementById("etatCivil").value,

        telephone:
            document.getElementById("telephone").value,

        adresse:
            document.getElementById("adresse").value,

        ville:
            document.getElementById("ville").value,

        quartier:
            document.getElementById("quartier").value,

        contactNom:
            document.getElementById("contactNom").value,

        contactTel:
            document.getElementById("contactTel").value,

        parente:
            document.getElementById("parente").value,

        service:
            document.getElementById("serviceDestination").value
    };

    try {

        let response =
            await fetch("/patients", {

                method: "POST",

                headers: {
                    "Content-Type":
                    "application/json"
                },

                body:
                JSON.stringify({ ...patient, email: getEmail() })

            });

        let result =
            await response.json();

        if (result.success) {

            alert(
                "Patient enregistré.\nDossier : "
                + result.dossier
            );

            document
            .getElementById("formPatient")
            .reset();

            genererNumero();

        } else {

            alert("Erreur.");

        }

    } catch(error) {

        console.error(error);

        alert(
            "Impossible de contacter le serveur."
        );
    }

});

// ===================================
// ENVOYER SERVICE
// ===================================

function envoyerService() {

    let service =
        document.getElementById(
            "serviceDestination"
        ).value;

    if(service === "") {

        alert(
            "Choisissez un service."
        );

        return;
    }

    alert(
        "Patient envoyé vers : "
        + service
    );
}

// ===================================
// MODE SOMBRE
// ===================================

function changerMode() {

    document.body.classList.toggle(
        "dark-mode"
    );
}

// ===================================
// DEMARRAGE
// ===================================

window.onload = function() {

    genererNumero();

    document
    .getElementById("age")
    .readOnly = true;

};