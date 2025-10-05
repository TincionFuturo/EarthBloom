document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener el ID del análisis actual que guardamos en Funciones.js
    const currentAnalysisId = localStorage.getItem('currentAnalysisId');
    const history = JSON.parse(localStorage.getItem('analysisHistory')) || [];

    // 2. Buscar el paquete de análisis completo en el historial usando el ID
    const analysisData = history.find(item => item.id === currentAnalysisId);

    const detailsContent = document.getElementById('details-card-content');
    const chartContainer = document.getElementById('indices-chart');
    const backButton = document.getElementById('back-to-map');

    if (!analysisData) {
        detailsContent.innerHTML = '<p>No se encontraron datos para este análisis. Por favor, vuelve al mapa y realiza uno nuevo.</p>';
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = 'index.html#mapa';
            });
        }
        return;
    }

    // 3. Extraer el último dato de la serie para la tarjeta de detalles
    const ndviSeries = analysisData.indices.ndvi;
    const ndwiSeries = analysisData.indices.ndwi;
    const ndreSeries = analysisData.indices.ndre;
    const cloudSeries = analysisData.indices.cloudCoverage; // Obtenemos la serie de nubes

    // Asegurarnos de que hay datos antes de intentar acceder a ellos
    if (ndviSeries.length > 0) {
        const lastNdviEntry = ndviSeries[ndviSeries.length - 1];
        const lastNdwiEntry = ndwiSeries[ndwiSeries.length - 1];
        const lastNdreEntry = ndreSeries[ndreSeries.length - 1];
        const lastCloudEntry = cloudSeries[cloudSeries.length - 1]; // Último dato de nubes

        detailsContent.innerHTML = `
            <h3>Resultados del ${lastNdviEntry.date}</h3>
            <p><strong>Área Analizada:</strong> ${analysisData.area} hectáreas</p>
            <p><strong>Índice de Vegetación (NDVI):</strong> ${lastNdviEntry.value.toFixed(4)}</p>
            <p><strong>Índice de Agua (NDWI):</strong> ${lastNdwiEntry.value.toFixed(4)}</p>
            <p><strong>Índice de Estrés (NDRE):</strong> ${lastNdreEntry.value.toFixed(4)}</p>
            <p><strong>Cobertura de Nubes:</strong> ${lastCloudEntry.value.toFixed(2)}%</p> <!-- Mostramos el porcentaje -->
        `;
    } else {
        detailsContent.innerHTML = `
            <h3>Análisis del ${new Date(analysisData.date).toLocaleDateString()}</h3>
            <p><strong>Área Analizada:</strong> ${analysisData.area} hectáreas</p>
            <p>No se encontraron datos de índices para el período seleccionado.</p>
        `;
    }

    // 4. Preparar los datos para el gráfico (toda la serie temporal)
    const chartLabels = ndviSeries.map(entry => entry.date);
    const chartNdviData = ndviSeries.map(entry => entry.value);
    const chartNdwiData = ndwiSeries.map(entry => entry.value);
    const chartNdreData = ndreSeries.map(entry => entry.value);
    const chartCloudData = cloudSeries.map(entry => entry.value); // Datos de nubes para el gráfico

    // Configurar el gráfico
    if (chartContainer) {
        const ctx = chartContainer.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: 'NDVI',
                        data: chartNdviData,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y', // Asignar al eje Y principal
                    },
                    {
                        label: 'NDWI',
                        data: chartNdwiData,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y', // Asignar al eje Y principal
                    },
                    {
                        label: 'NDRE',
                        data: chartNdreData,
                        borderColor: 'rgba(255, 206, 86, 1)',
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y', // Asignar al eje Y principal
                    },
                    {
                        label: 'Nubes (%)', // Nueva serie en el gráfico
                        data: chartCloudData,
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y1' // Asignamos esta serie a un segundo eje Y
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Evolución de Índices y Nubes en el Tiempo' }
                },
                scales: {
                    y: { // Eje Y principal para los índices (-1 a 1)
                        type: 'linear',
                        display: true,
                        position: 'left',
                        suggestedMin: -1,
                        suggestedMax: 1,
                        title: {
                            display: true,
                            text: 'Valor del Índice'
                        }
                    },
                    y1: { // Eje Y secundario para las nubes (0 a 100)
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Nubes (%)'
                        },
                        // Para que la cuadrícula no se superponga
                        grid: {
                            drawOnChartArea: false, 
                        },
                    }
                }
            }
        });
    }

    // Botón para volver al mapa
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Guardamos la geometría para que el mapa pueda mostrarla al volver
            localStorage.setItem('revisitLocation', JSON.stringify(analysisData.geometry));
            window.location.href = 'index.html#mapa';
        });
    }
});