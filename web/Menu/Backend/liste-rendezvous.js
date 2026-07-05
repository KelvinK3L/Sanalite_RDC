// =========================================================================
// SanaLite RDC — Liste des rendez-vous
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {

    const tableBody = document.getElementById("table-body");
    const emptyState = document.getElementById("empty-state");
    const recherche = document.getElementById("recherche");
    const filtreStatut = document.getElementById("filtre-statut");

    function classeStatut(statut) {
        const map = {
            "Programmé": "statut-programme",
            "Confirmé": "statut-confirme",
            "Reporté": "statut-reporte",
            "Annulé": "statut-annule"
        };
        return map[statut] || "statut-programme";
    }

    function getListe() {
        return JSON.parse(localStorage.getItem("rendezvous")) || [];
    }

    function sauvegarderListe(liste) {
        localStorage.setItem("rendezvous", JSON.stringify(liste));
    }

    function render() {
        const liste = getListe();
        const texte = recherche.value.trim().toLowerCase();
        const statut = filtreStatut.value;

        const filtree = liste.filter((rdv) => {
            const matchTexte = !texte ||
                (rdv.nom || "").toLowerCase().includes(texte) ||
                (rdv.dossier || "").toLowerCase().includes(texte);
            const matchStatut = !statut || rdv.statut === statut;
            return matchTexte && matchStatut;
        });

        // Les rendez-vous les plus récents (par date) en premier
        filtree.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));

        tableBody.innerHTML = "";

        if (filtree.length === 0) {
            emptyState.style.display = "block";
            emptyState.querySelector("p").textContent = liste.length === 0
                ? "Aucun rendez-vous enregistré pour le moment."
                : "Aucun résultat pour cette recherche.";
            return;
        }

        emptyState.style.display = "none";

        filtree.forEach((rdv) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${escapeHtml(rdv.dossier)}</td>
                <td>${escapeHtml(rdv.nom)}</td>
                <td>${formatDate(rdv.date)}</td>
                <td>${escapeHtml(rdv.heure || "—")}</td>
                <td>${escapeHtml(rdv.service || "—")}</td>
                <td>${escapeHtml(rdv.medecin || "—")}</td>
                <td><span class="badge ${classeStatut(rdv.statut)}">${escapeHtml(rdv.statut || "Programmé")}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn delete" title="Supprimer" data-id="${rdv.id}">🗑️</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll(".icon-btn.delete").forEach((btn) => {
            btn.addEventListener("click", () => {
                if (!confirm("Supprimer ce rendez-vous ?")) return;
                const nouvelleListe = getListe().filter((r) => r.id !== btn.dataset.id);
                sauvegarderListe(nouvelleListe);
                render();
                afficherToast("Rendez-vous supprimé.");
            });
        });
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function formatDate(iso) {
        if (!iso) return "—";
        const [y, m, d] = iso.split("-");
        return `${d}/${m}/${y}`;
    }

    recherche.addEventListener("input", render);
    filtreStatut.addEventListener("change", render);

    // ---------------------------------------------------------------------
    // Toast (affiché si redirection depuis l'enregistrement)
    // ---------------------------------------------------------------------
    function afficherToast(message, isError) {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.classList.toggle("error", !!isError);
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3200);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
        afficherToast("Rendez-vous enregistré avec succès.");
        history.replaceState({}, "", window.location.pathname);
    }

    render();
});

// =========================================================================
// MODE SOMBRE
// =========================================================================

window.addEventListener("load", () => {
    const mode = localStorage.getItem("theme");
    if (mode === "sombre") {
        document.body.classList.add("sombre");
        const btn = document.querySelector(".darkmode");
        if (btn) btn.innerHTML = "☀️";
    }
});

function changerMode() {
    document.body.classList.toggle("sombre");
    const bouton = document.querySelector(".darkmode");
    const estSombre = document.body.classList.contains("sombre");
    bouton.innerHTML = estSombre ? "☀️" : "🌙";
    localStorage.setItem("theme", estSombre ? "sombre" : "clair");
}
