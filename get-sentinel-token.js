const axios = require('axios');

exports.handler = async function() {
  const CLIENT_ID = process.env.SENTINEL_CLIENT_ID;
  const CLIENT_SECRET = process.env.SENTINEL_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan SENTINEL_CLIENT_ID/SENTINEL_CLIENT_SECRET en Netlify" }) };
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  try {
    const { data } = await axios.post(
      'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    const status = err.response?.status || 500;
    const details = err.response?.data || err.message;
    console.error("Auth error:", details);
    return { statusCode: status, body: JSON.stringify({ error: "Fallo autenticación", details }) };
  }
};