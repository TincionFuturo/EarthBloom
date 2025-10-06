document.addEventListener('DOMContentLoaded', () => {
    const historyList = document.getElementById('history-list');
    const emptyMsg = document.getElementById('empty-history-msg');
    const compareBtn = document.getElementById('compare-btn');
    const exportBtn = document.getElementById('export-csv-btn');

    let selectedForComparison = [];

    function loadHistory() {
        const analysisHistory = JSON.parse(localStorage.getItem('analysisHistory')) || [];
        historyList.innerHTML = '';

        if (analysisHistory.length === 0) {
            emptyMsg.style.display = 'block';
            exportBtn.disabled = true;
        } else {
            emptyMsg.style.display = 'none';
            exportBtn.disabled = false;
       
            analysisHistory.reverse().forEach(item => {
                const card = createHistoryCard(item);
                historyList.appendChild(card);
            });
        }
    }

    function createHistoryCard(item) {
        const card = document.createElement('div');
        card.className = 'history-item';
        card.dataset.id = item.id;

        const date = new Date(item.date).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const avgNdvi = item.indices.ndvi.length > 0 
            ? (item.indices.ndvi.reduce((acc, curr) => acc + curr.value, 0) / item.indices.ndvi.length).toFixed(3)
            : 'N/A';

        card.innerHTML = `
            <div class="history-item-header">
                <h4>Análisis del ${date}</h4>
                <input type="checkbox" class="compare-checkbox" title="Seleccionar para comparar">
            </div>
            <div class="history-item-body">
                <p><strong>Tipo:</strong> ${item.cropType || 'No especificado'}</p>
                <p><strong>Área:</strong> ${item.area} hectáreas</p>
                <p><strong>NDVI Promedio:</strong> ${avgNdvi}</p>
            </div>
            <div class="history-item-actions">
                <button class="btn-details">Ver Detalles</button>
                <button class="btn-revisit">Revisitar en Mapa</button>
                <button class="btn-delete">Eliminar</button>
            </div>
        `;

      
        card.querySelector('.btn-details').addEventListener('click', () => viewDetails(item.id));
        card.querySelector('.btn-revisit').addEventListener('click', () => revisitOnMap(item.geometry));
        card.querySelector('.btn-delete').addEventListener('click', () => deleteItem(item.id));
        card.querySelector('.compare-checkbox').addEventListener('change', (e) => handleCompareSelection(e, item.id));

        return card;
    }

    function handleCompareSelection(event, itemId) {
        if (event.target.checked) {
            if (selectedForComparison.length < 2) {
                selectedForComparison.push(itemId);
                document.querySelector(`[data-id="${itemId}"]`).classList.add('selected');
            } else {
                event.target.checked = false; 
                alert('Solo puedes comparar 2 análisis a la vez.');
            }
        } else {
            selectedForComparison = selectedForComparison.filter(id => id !== itemId);
            document.querySelector(`[data-id="${itemId}"]`).classList.remove('selected');
        }
        
        compareBtn.textContent = `Comparar Seleccionados (${selectedForComparison.length}/2)`;
        compareBtn.disabled = selectedForComparison.length !== 2;
    }

    function viewDetails(itemId) {
        localStorage.setItem('currentAnalysisId', itemId);
        window.location.href = 'detalles.html';
    }

    function revisitOnMap(geometry) {
        localStorage.setItem('revisitLocation', JSON.stringify(geometry));
        window.location.href = 'index.html#mapa';
    }

    function deleteItem(itemId) {
        if (confirm('¿Estás seguro de que quieres eliminar este análisis?')) {
            let history = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            history = history.filter(item => item.id !== itemId);
            localStorage.setItem('analysisHistory', JSON.stringify(history));
            loadHistory(); 
        }
    }
    
    function exportToCSV() {
        const history = JSON.parse(localStorage.getItem('analysisHistory')) || [];
        if (history.length === 0) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID de Análisis,Fecha,Tipo de Flora,Área (ha),NDVI Promedio,NDWI Promedio,NDRE Promedio\r\n";

        history.forEach(item => {
            const avg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b.value, 0) / arr.length).toFixed(4) : 'N/A';
            const row = [
                item.id,
                new Date(item.date).toISOString(),
                item.cropType || 'No especificado',
                item.area,
                avg(item.indices.ndvi),
                avg(item.indices.ndwi),
                avg(item.indices.ndre)
            ].join(",");
            csvContent += row + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "historial_bloomwatch.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    compareBtn.addEventListener('click', () => {
        if (selectedForComparison.length === 2) {
            alert(`Comparando análisis:\n1: ${selectedForComparison[0]}\n2: ${selectedForComparison[1]}`);
        }
    });

    exportBtn.addEventListener('click', exportToCSV);

    loadHistory();

});
