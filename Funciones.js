document.addEventListener('DOMContentLoaded', function () {

  // --- CÓDIGO PARA EFECTO PARALLAX ---
  const heroScene = document.querySelector('.hero-scene');
  if (heroScene) {
    const globeContainer = document.querySelector('.globe-container');
    const heroText = document.querySelector('.hero-text');
    const particles = document.getElementById('particles-foreground');
    heroScene.addEventListener('mousemove', function(e) {
      const { clientX, clientY } = e;
      const { offsetWidth, offsetHeight } = heroScene;
      const xPos = (clientX / offsetWidth) - 0.5;
      const yPos = (clientY / offsetHeight) - 0.5;
      if (globeContainer) globeContainer.style.transform = `translate(${xPos*20}px, ${yPos*20}px)`;
      if (heroText) heroText.style.transform = `translate(${xPos*-10}px, ${yPos*-10}px)`;
      if (particles) particles.style.transform = `translate(${xPos*40}px, ${yPos*40}px)`;
    });
  }

  // --- LÓGICA DE MISIONES DIARIAS ---
  function generateDailyMissions() {
    const missionPool = [
      { title: "El Despertar de la Primavera", desc: "Encuentra un área en el hemisferio norte donde el NDVI haya aumentado significativamente en los últimos 3 meses.", lat: 40, lng: -95 },
      { title: "El Estrés del Verano", desc: "Localiza una zona agrícola en el sur de España y busca signos de estrés hídrico (NDWI bajo).", lat: 37, lng: -5 },
      { title: "Retroceso Glaciar en Groenlandia", desc: "Observa la costa oeste de Groenlandia para identificar el retroceso de los glaciares.", lat: 70, lng: -50 },
      { title: "Deforestación Amazónica", desc: "Explora el estado de Rondônia, en Brasil, un área conocida por la deforestación.", lat: -11.5, lng: -62.5 }
    ];
    const missionContainer = document.getElementById('mission-1-title');
    if (!missionContainer) return;

    const getDayOfYear = () => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 0); const diff = now - start; const oneDay = 1000*60*60*24; return Math.floor(diff/oneDay); };
    const dayOfYear = getDayOfYear();
    const missionCount = missionPool.length;
    const index1 = dayOfYear % missionCount;
    const index2 = (dayOfYear + 3) % missionCount;
    const mission1 = missionPool[index1];
    const mission2 = missionPool[index2 === index1 ? (index1 + 1) % missionCount : index2];
    document.getElementById('mission-1-title').textContent = mission1.title;
    document.getElementById('mission-1-desc').textContent = mission1.desc;
    const btn1 = document.getElementById('mission-1-btn'); btn1.dataset.lat = mission1.lat; btn1.dataset.lng = mission1.lng;
    document.getElementById('mission-2-title').textContent = mission2.title;
    document.getElementById('mission-2-desc').textContent = mission2.desc;
    const btn2 = document.getElementById('mission-2-btn'); btn2.dataset.lat = mission2.lat; btn2.dataset.lng = mission2.lng;
  }
  generateDailyMissions();

  // --- CÓDIGO DEL MAPA ---
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;

  const hybridMap = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: 'Datos del mapa ©2025 Google', noWrap: true });
  const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', noWrap: true });
  let ndviTimeLayer = L.tileLayer('', { attribution: 'Sentinel Hub | Copernicus', zIndex: 5 });

  const map = L.map('map-container', {
    layers: [hybridMap, ndviTimeLayer],
    minZoom: 2,
    zoomControl: false,
    maxBounds: [[-90,-180],[90,180]]
  }).setView([20,0], 2);

  const baseMaps = { "Híbrido": hybridMap, "Callejero": streetMap };
  const overlayMaps = { "NDVI Global": ndviTimeLayer };
  L.control.layers(baseMaps, overlayMaps).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  const drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: { polygon: true, rectangle: true, marker: true, polyline: false, circle: false, circlemarker: false }
  });
  map.addControl(drawControl);
  loadSavedShapes();

  // --- LÓGICA DE LA LÍNEA DE TIEMPO ---
  const timelineSlider = document.getElementById('timeline-slider');
  const timelineYear = document.getElementById('timeline-year');

  function updateNDVILayer(year) {
    if (typeof sentinelHubInstanceId === 'undefined' || !sentinelHubInstanceId || sentinelHubInstanceId === "TU_INSTANCE_ID") {
      console.error("sentinelHubInstanceId no configurado en sentinel.js");
      if (map.hasLayer(ndviTimeLayer)) map.removeLayer(ndviTimeLayer);
      return;
    }
    const timeFrom = `${year}-01-01T00:00:00Z`;
    const timeTo   = `${year}-12-31T23:59:59Z`;
    const ndviUrl = `https://services.sentinel-hub.com/ogc/wms/${sentinelHubInstanceId}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=NDVI&CRS=EPSG:3857&TIME=${timeFrom}/${timeTo}&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`;
    ndviTimeLayer.setUrl(ndviUrl);
    if (timelineYear) timelineYear.textContent = year;
  }
  if (timelineSlider) {
    timelineSlider.addEventListener('input', (e) => updateNDVILayer(e.target.value));
    updateNDVILayer(timelineSlider.value);
  }

  // --- DIBUJO Y ANÁLISIS ---
  map.on(L.Draw.Event.CREATED, async function (event) {
    const layer = event.layer;
    const type = event.layerType;

    if (type !== 'rectangle' && type !== 'polygon') {
      if (type === 'marker') {
        drawnItems.addLayer(layer);
        addZoomOnClick(layer);
        const coords = layer.getLatLng();
        const locationName = await getReverseGeocode(coords.lat, coords.lng);
        let poiHistory = JSON.parse(localStorage.getItem('poiHistory')) || [];
        poiHistory.push({ id: Date.now(), name: locationName || `Punto de Interés`, coords: [coords.lat, coords.lng] });
        localStorage.setItem('poiHistory', JSON.stringify(poiHistory));
        alert(`Punto de Interés guardado en: ${locationName}`);
      }
      return;
    }

    drawnItems.addLayer(layer);
    const areaHa = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 10000;
    const geojson = layer.toGeoJSON().geometry;
    const loadingPopup = L.popup().setLatLng(layer.getBounds().getCenter()).setContent('Obteniendo datos y clasificación...').openOn(map);

    try {
      const authToken = await getAuthToken();
      const [satelliteData, landCoverData] = await Promise.all([
        getSatelliteData(authToken, geojson),
        getLandCoverData(authToken, geojson)
      ]);
      const analysisPackage = processSatelliteData(satelliteData, areaHa, geojson, landCoverData);
      map.closePopup();
      L.popup().setLatLng(layer.getBounds().getCenter()).setContent('¡Análisis completado! Revisa el historial.').openOn(map);
      saveToHistory(analysisPackage);
      localStorage.setItem('currentAnalysisId', analysisPackage.id);
      setTimeout(() => { window.location.href = 'detalles.html'; }, 1000);
    } catch (error) {
      console.error("Error al procesar la solicitud a Sentinel:", error);
      map.closePopup();
      L.popup().setLatLng(layer.getBounds().getCenter()).setContent(`Error: ${error.message}`).openOn(map);
    }
  });

  // Land cover con ESA WorldCover (colección oficial). Corrige el 400 “Invalid collection type”.
  async function getLandCoverData(authToken, geojson) {
    if (typeof LULC_EVALSCRIPT === 'undefined') {
      console.warn("LULC_EVALSCRIPT no está definido. Saltando clasificación de terreno.");
      return null;
    }

    // Usaremos 2021 (última versión estable). Puedes cambiar a 2020 si lo prefieres.
    const from = "2021-01-01T00:00:00Z";
    const to   = "2021-12-31T23:59:59Z";

    const requestBody = {
      input: {
        bounds: { geometry: geojson },
        data: [{
          type: "esa-worldcover",
          dataFilter: { timeRange: { from, to } }
        }]
      },
      aggregation: {
        evalscript: LULC_EVALSCRIPT,
        // No necesitamos aggregationInterval para un producto no temporal,
        // pero lo dejamos simple: el API generará histograma de la banda.
      }
    };

    const response = await fetch(`https://services.sentinel-hub.com/api/v1/statistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en API de clasificación: ${errorText}`);
    }
    const stats = await response.json();
    // histograma de códigos de clase
    return stats.data?.[0]?.outputs?.default?.bands?.B0?.stats?.histogram?.bins || [];
  }

  function processSatelliteData(sentinelData, areaHa, geojson, landCoverBins) {
    const analysisId = `analisis_${Date.now()}`;
    const analysisDate = new Date().toISOString();
    const ndviSeries = [], ndwiSeries = [], ndreSeries = [], cloudCoverageSeries = [];

    // Mapa de clases ESA WorldCover
    const landCoverMap = {
      10: "Cobertura arbórea",
      20: "Matorral",
      30: "Pastizal",
      40: "Cultivos",
      50: "Área construida",
      60: "Suelo desnudo/escasa vegetación",
      70: "Nieve/Hielo",
      80: "Agua permanente",
      90: "Humedal herbáceo",
      95: "Manglar",
      100: "Musgo/Líquenes"
    };

    let dominantCover = "No disponible";
    if (Array.isArray(landCoverBins) && landCoverBins.length > 0) {
      const dominantBin = landCoverBins.reduce((prev, cur) => (prev.count > cur.count ? prev : cur));
      // En WorldCover los bins pueden venir como {low:code, high:code+...}
      const code = Math.round(dominantBin.low);
      dominantCover = landCoverMap[code] || `Clase ${code}`;
    }

    if (sentinelData && Array.isArray(sentinelData.data)) {
      sentinelData.data.forEach(d => {
        const date = d.interval.from.split('T')[0];
        const out = d.outputs;

        const safeNumber = (v) => Number.isFinite(v) ? v : NaN;

        const ndvi = safeNumber(out?.indices?.bands?.B0?.stats?.mean);
        const ndwi = safeNumber(out?.indices?.bands?.B1?.stats?.mean);
        const ndre = safeNumber(out?.indices?.bands?.B2?.stats?.mean);

        if (Number.isFinite(ndvi)) ndviSeries.push({ date, value: +ndvi.toFixed(4) });
        if (Number.isFinite(ndwi)) ndwiSeries.push({ date, value: +ndwi.toFixed(4) });
        if (Number.isFinite(ndre)) ndreSeries.push({ date, value: +ndre.toFixed(4) });

        const cloudMean = safeNumber(out?.cloud_info?.bands?.B0?.stats?.mean);
        if (Number.isFinite(cloudMean)) {
          cloudCoverageSeries.push({ date, value: +(cloudMean * 100).toFixed(2) });
        }
      });
    }

    return {
      id: analysisId,
      date: analysisDate,
      area: areaHa.toFixed(2),
      geometry: geojson,
      cropType: dominantCover,
      indices: { ndvi: ndviSeries, ndwi: ndwiSeries, ndre: ndreSeries, cloudCoverage: cloudCoverageSeries },
      recommendations: "Recomendaciones basadas en datos reales próximamente."
    };
  }

  function saveToHistory(analysisPackage) {
    let history = JSON.parse(localStorage.getItem('analysisHistory')) || [];
    history.push(analysisPackage);
    localStorage.setItem('analysisHistory', JSON.stringify(history));
  }

  function loadSavedShapes() {
    const analysisHistory = JSON.parse(localStorage.getItem('analysisHistory')) || [];
    analysisHistory.forEach(analysis => {
      if (analysis.geometry) {
        const layer = L.geoJSON(analysis.geometry, { style: { color: "#2ecc71", weight: 1, opacity: 0.7, interactive: false } });
        drawnItems.addLayer(layer);
      }
    });
    const poiHistory = JSON.parse(localStorage.getItem('poiHistory')) || [];
    poiHistory.forEach(poi => {
      if (poi.coords) {
        const marker = L.marker(poi.coords);
        addZoomOnClick(marker);
        drawnItems.addLayer(marker);
      }
    });
  }

  function addZoomOnClick(marker) { marker.on('click', e => map.setView(e.target.getLatLng(), 16)); }

  async function getReverseGeocode(lat, lon) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { cache: 'no-cache' });
      const data = await response.json();
      return data.address?.village || data.address?.town || data.address?.city || data.display_name;
    } catch (error) {
      console.error("Error en geocodificación inversa:", error);
      return `Ubicación en ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }

  const revisitLocationData = localStorage.getItem('revisitLocation');
  if (revisitLocationData) {
    try {
      const revisitBounds = JSON.parse(revisitLocationData);
      if (revisitBounds && revisitBounds.type === "Polygon") {
        const layer = L.geoJSON(revisitBounds, { style: { color: "#3498db", weight: 2, fillOpacity: 0.1, interactive: false } });
        setTimeout(() => { map.fitBounds(layer.getBounds()); layer.addTo(map); }, 200);
      }
      localStorage.removeItem('revisitLocation');
    } catch (e) {
      console.error("Error al procesar 'revisitLocation'.", e);
      localStorage.removeItem('revisitLocation');
    }
  }

  map.on('draw:drawstop', function () { drawControl._toolbars.draw.disable(); });

  const missionButtons = document.querySelectorAll('.mission-btn');
  const mapSection = document.getElementById('mapa');
  missionButtons.forEach(button => {
    button.addEventListener('click', function() {
      const lat = parseFloat(this.dataset.lat);
      const lng = parseFloat(this.dataset.lng);
      if (lat && lng) {
        if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth' });
        map.flyTo([lat, lng], 9, { duration: 2 });
        const pulseMarker = L.circle([lat, lng], { radius: 20000, color: '#e67e22', fillColor: '#f39c12', fillOpacity: 0.5 }).addTo(map);
        setTimeout(() => { map.removeLayer(pulseMarker); }, 3000);
      }
    });
  });
});