// =========================================
// IMPRIMER LA CONSULTATION
// =========================================
function imprimerConsultation() {

    if (!patientActuel) {
        alert("Aucun patient sélectionné.");
        return;
    }

    // Si tu stockes la consultation courante dans une variable
    const consultation = patientActuel.consultation || {};

    const contenu = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Consultation - ${patientActuel.nom}</title>

        <style>
            body{
                font-family:Arial,Helvetica,sans-serif;
                padding:35px;
                color:#222;
                line-height:1.5;
            }

            h1{
                text-align:center;
                color:#2563eb;
                margin-bottom:5px;
            }

            h2{
                margin-top:30px;
                color:#2563eb;
                border-bottom:2px solid #2563eb;
                padding-bottom:5px;
            }

            table{
                width:100%;
                border-collapse:collapse;
                margin-top:15px;
            }

            td{
                border:1px solid #ccc;
                padding:10px;
            }

            strong{
                color:#111;
            }

            .footer{
                margin-top:60px;
                display:flex;
                justify-content:space-between;
            }
        </style>
    </head>

    <body>

        <h1>SanaLite RDC</h1>
        <p style="text-align:center">
            Rapport de consultation médicale
        </p>

        <h2>Informations du patient</h2>

        <table>
            <tr>
                <td><strong>Dossier</strong></td>
                <td>${patientActuel.dossier}</td>
            </tr>

            <tr>
                <td><strong>Nom</strong></td>
                <td>${patientActuel.nom}</td>
            </tr>

            <tr>
                <td><strong>Sexe</strong></td>
                <td>${patientActuel.sexe}</td>
            </tr>

            <tr>
                <td><strong>Téléphone</strong></td>
                <td>${patientActuel.tel || "-"}</td>
            </tr>
        </table>

        <h2>Consultation</h2>

        <table>

            <tr>
                <td><strong>Date</strong></td>
                <td>${consultation.date || ""}</td>
            </tr>

            <tr>
                <td><strong>Médecin</strong></td>
                <td>${consultation.medecin || ""}</td>
            </tr>

            <tr>
                <td><strong>Motif</strong></td>
                <td>${consultation.motif || ""}</td>
            </tr>

            <tr>
                <td><strong>Diagnostic</strong></td>
                <td>${consultation.diagnostic || ""}</td>
            </tr>

            <tr>
                <td><strong>Traitement</strong></td>
                <td>${consultation.traitement || ""}</td>
            </tr>

            <tr>
                <td><strong>Observations</strong></td>
                <td>${consultation.observations || ""}</td>
            </tr>

        </table>

        <div class="footer">
            <div>
                _______________________<br>
                Signature du médecin
            </div>

            <div>
                _______________________<br>
                Cachet de l'hôpital
            </div>
        </div>

    </body>
    </html>
    `;

    const fenetre = window.open("", "_blank");

    fenetre.document.write(contenu);
    fenetre.document.close();

    fenetre.focus();

    setTimeout(() => {
        fenetre.print();
        fenetre.close();
    }, 500);
}