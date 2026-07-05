let presenceChart = null;

function createPresenceGraph(presents = 0, justifies = 0, absents = 0) {

    const canvas = document.getElementById("presenceChart");

    if (!canvas) {
        console.error("Canvas introuvable");
        return;
    }

    const ctx = canvas.getContext("2d");

    if (presenceChart) {
        presenceChart.destroy();
    }

    presenceChart = new Chart(ctx, {
        type: "doughnut",

        data: {
            labels: [
                "Présents",
                "Absents",
                "Absences justifiées",
            ],

            datasets: [{
                data: [
                    presents,
                    justifies,
                    absents
                ],

                backgroundColor: [
                    "#22c55e", 
                    "#ef4444",  // vert
                    "#f59e0b",   // orange
                                  // rouge
                ]
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}