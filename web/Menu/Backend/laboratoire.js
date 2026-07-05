let data = [];
let compteur = 1;

// ==========================
// CHARGEMENT AUTO
// ==========================
window.onload = function(){
    let saved = localStorage.getItem("labData");
    let savedCompteur = localStorage.getItem("labCompteur");

    if(saved){
        data = JSON.parse(saved);
    }

    if(savedCompteur){
        compteur = parseInt(savedCompteur);
    }

    afficher();
};

// ==========================
// SAUVEGARDE
// ==========================
function save(){
    localStorage.setItem("labData", JSON.stringify(data));
    localStorage.setItem("labCompteur", compteur);
}

// ==========================
// AJOUT ANALYSE
// ==========================
function ajouter(){

let patient = document.getElementById("patient").value.trim();
let type = document.getElementById("type").value;
let priorite = document.getElementById("priorite").value;

if(!patient){
    alert("Nom du patient obligatoire !");
    return;
}

let analyse = {
    id: compteur,
    echantillon: "LAB-" + String(compteur).padStart(3, "0"),
    patient,
    type,
    priorite,
    statut: "en attente",
    resultat: "",
    critique: false,
    date: new Date().toLocaleString()
};

data.push(analyse);
compteur++;

save();
afficher();
viderFormulaire();
}

// ==========================
// AFFICHAGE + RECHERCHE
// ==========================
function afficher(){

let liste = document.getElementById("liste");
let searchEl = document.getElementById("search");
let search = searchEl ? searchEl.value.toLowerCase() : "";

liste.innerHTML = "";

data
.filter(a =>
    a.patient.toLowerCase().includes(search) ||
    a.type.toLowerCase().includes(search)
)
.forEach(a => {

let badge = a.priorite === "Urgent" ? "🔥" : "⚪";
let statutColor = a.statut === "terminé" ? "badge-green" : "badge-blue";

liste.innerHTML += `
<tr onclick="openDetails(${a.id})" style="cursor:pointer" class="${a.critique ? 'critique' : ''}">
    <td>${a.id}</td>
    <td>${a.echantillon}</td>
    <td>${a.patient}</td>
    <td>${a.type}</td>
    <td>${badge} ${a.priorite}</td>
    <td><span class="${statutColor}">${a.statut}</span></td>
    <td>
        ${a.resultat || "-"}
        ${a.critique ? " 🚨" : ""}
    </td>
</tr>
`;
});
}
// ==========================
// VALIDATION
// ==========================
function valider(){

let id = parseInt(document.getElementById("id").value);
let res = document.getElementById("resultat").value.trim();

let a = data.find(x => x.id === id);

if(!a){
    alert("Analyse introuvable !");
    return;
}

if(!res){
    alert("Résultat vide !");
    return;
}

a.resultat = res;
a.statut = "terminé";

let r = res.toLowerCase();
a.critique = r.includes("danger") || r.includes("critique") || r.includes("élevé");

save();
afficher();
alert("Résultat validé ✔");
}

// ==========================
// DETAILS MODAL
// ==========================
function openDetails(id){

let a = data.find(x => x.id === id);
if(!a) return;

document.getElementById("modalContent").innerHTML = `
<p><b>Patient:</b> ${a.patient}</p>
<p><b>Type:</b> ${a.type}</p>
<p><b>Échantillon:</b> ${a.echantillon}</p>
<p><b>Priorité:</b> ${a.priorite}</p>
<p><b>Statut:</b> ${a.statut}</p>
<p><b>Résultat:</b> ${a.resultat || "Non défini"}</p>
<p><b>Date:</b> ${a.date}</p>
`;

document.getElementById("modal").style.display = "flex";
}

// ==========================
// FERMER MODAL
// ==========================
function closeModal(){
document.getElementById("modal").style.display = "none";
}

// ==========================
// RESET
// ==========================
function viderFormulaire(){
document.getElementById("patient").value = "";
}

function imprimerPDF(){
    window.print();
}