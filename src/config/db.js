const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('Configura DATABASE_URL en el archivo .env con la URL real de PostgreSQL.');
}

let databaseUrl;
try {
    databaseUrl = new URL(process.env.DATABASE_URL);
} catch {
    throw new Error('DATABASE_URL debe ser una URL valida de PostgreSQL. Revisa el archivo .env.');
}

if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
    databaseUrl.hostname.toLowerCase() === 'host' ||
    databaseUrl.pathname.toUpperCase() === '/NOMBRE_BD') {
    throw new Error('DATABASE_URL contiene valores de ejemplo o un protocolo incorrecto. Reemplazala en .env con la URL real de PostgreSQL; no uses HOST ni NOMBRE_BD.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
});

module.exports = pool;
