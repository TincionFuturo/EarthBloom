
const sentinelHubInstanceId = "TU_INSTANCE_ID";


const EVALSCRIPT_INDICES = `//VERSION=3
function setup() {
  return {
    input: ["B02","B03","B04","B08","SCL","dataMask"],
    output: [
      { id: "indices", bands: 3, sampleType: "FLOAT32" },
      { id: "cloud_info", bands: 1, sampleType: "FLOAT32" }
    ]
  };
}
function evaluatePixel(s) {
  if (s.dataMask !== 1) return { indices:[NaN,NaN,NaN], cloud_info:[NaN] };
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  let ndwi = (s.B03 - s.B08) / (s.B03 + s.B08);
  let ndre = (s.B08 - s.B02) / (s.B08 + s.B02);
  // SCL 8/9/10 = clouds
  let cloud = (s.SCL===8 || s.SCL===9 || s.SCL===10) ? 1.0 : 0.0;
  return { indices:[ndvi, ndwi, ndre], cloud_info:[cloud] };
}
`;


const LULC_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: ["Map","dataMask"],
    output: { id:"default", bands:1, sampleType:"UINT16" }
  };
}
function evaluatePixel(s) {
  if (s.dataMask !== 1) return [0];
  // 'Map' ya contiene el código de clase ESA WorldCover (10,20,30,...,100)
  return [s.Map];
}
`;


let cachedToken = null;
async function getAuthToken() {
  if (cachedToken) return cachedToken;

  const endpoints = [
    "/.netlify/functions/get-sentinel-token",
    "/api/get-sentinel-token"
  ];

  let lastErr;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
      const data = await res.json();
      cachedToken = data.access_token;
      return cachedToken;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No se pudo obtener token");
}


async function getSatelliteData(token, geojson) {
  const today = new Date();
  const from = new Date(today);
  from.setMonth(today.getMonth() - 1);

  const body = {
    input: {
      bounds: { geometry: geojson },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: { from: from.toISOString(), to: today.toISOString() },
          mosaickingOrder: "leastCC"
        }
      }]
    },
    aggregation: {
      evalscript: EVALSCRIPT_INDICES,
      aggregationInterval: { of: "P1D" }
    }
  };

  const res = await fetch("https://services.sentinel-hub.com/api/v1/statistics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Statistics S2 error ${res.status}: ${t}`);
  }
  return res.json();
}


window.sentinelHubInstanceId = sentinelHubInstanceId;
window.getAuthToken = getAuthToken;
window.getSatelliteData = getSatelliteData;

window.LULC_EVALSCRIPT = LULC_EVALSCRIPT;
