const fs = require('fs');
const path = require('path');

async function inicializar() {
    let pool;
    try {
        pool = require('../config/db');
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('Tabla "productos" lista.');
    } catch (err) {
        console.error('No se pudo inicializar la base de datos:', err.message);
        process.exitCode = 1;
    } finally {
        if (pool) await pool.end();
    }
}

inicializar();
