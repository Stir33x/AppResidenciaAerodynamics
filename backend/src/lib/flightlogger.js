// ============================================================
// FLIGHTLOGGER — Integración con la API externa de FlightLogger
// ============================================================
// Configuración en el .env del backend:
//   FLIGHTLOGGER_API_URL  https://api.flightlogger.net/graphql
//   FLIGHTLOGGER_API_KEY  <tu_api_key>
//
// El frontend dispara la búsqueda SOLO al escribir las 3 primeras
// letras (límite de peticiones de FlightLogger). A partir de ahí
// se reciben hasta 50 primeros resultados y el frontend los acota
// localmente según las letras que se sigan escribiendo, sin volver
// a llamar a la API. searchTerm busca a la vez nombre, apellido y correo.
// ============================================================

const FLIGHTLOGGER_API_URL = process.env.FLIGHTLOGGER_API_URL || '';
const FLIGHTLOGGER_API_KEY = process.env.FLIGHTLOGGER_API_KEY || '';

// Nº máximo de usuarios a solicitar por petición (límite por defecto).
const SEARCH_FIRST = parseInt(process.env.FLIGHTLOGGER_SEARCH_FIRST, 10) || 50;

const SEARCH_QUERY = `
query Users($first: Int, $searchTerm: String) {
  users(
    first: $first
    searchTerm: $searchTerm
  ) {
    nodes {
      id
      firstName
      lastName
      contact {
        email
      }
    }
  }
}`;

function configureError() {
  return new Error('FlightLogger no está configurado: añade FLIGHTLOGGER_API_URL y FLIGHTLOGGER_API_KEY al .env');
}

// Normaliza la respuesta de FlightLogger (users.nodes) al formato interno.
function normalizeUser(u) {
  return {
    flightlogger_id: String(u?.id ?? ''),
    nombre: u?.firstName ?? '',
    apellidos: u?.lastName ?? '',
    email: u?.contact?.email ?? '',
    telefono: u?.contact?.phone ?? '',
  };
}

// Busca usuarios en FlightLogger por nombre, apellido o correo.
// query: SÓLO 3 caracteres (lo exige el límite de peticiones).
async function searchUsers(query) {
  if (!FLIGHTLOGGER_API_URL || !FLIGHTLOGGER_API_KEY) {
    throw configureError();
  }
  if (!query || query.length !== 3) {
    return [];
  }

  const res = await fetch(FLIGHTLOGGER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FLIGHTLOGGER_API_KEY}`,
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { first: SEARCH_FIRST, searchTerm: query },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`FlightLogger respondió ${res.status}`);
  }

  const data = await res.json();
  if (data && data.errors && data.errors.length > 0) {
    throw new Error(`FlightLogger error: ${data.errors.map((e) => e.message).join(', ')}`);
  }
  return ((data?.data?.users?.nodes) || []).map(normalizeUser).filter((u) => u.flightlogger_id);
}

module.exports = { searchUsers, FLIGHTLOGGER_API_URL, FLIGHTLOGGER_API_KEY, SEARCH_QUERY, SEARCH_FIRST };