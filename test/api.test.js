const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../src/app');
const pool = require('../src/config/db');

test('API conectada a PostgreSQL', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(async () => {
        await new Promise((resolve) => server.close(resolve));
        await pool.end();
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    await t.test('GET /api/info devuelve la informacion de la API', async () => {
        const response = await fetch(`${baseUrl}/api/info`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /application\/json/);
        assert.deepEqual(await response.json(), {
            nombre: require('../package.json').name,
            version: require('../package.json').version,
            mensaje: 'API funcionando correctamente',
        });
    });

    await t.test('GET /api/health devuelve 200 y confirma la base de datos', async () => {
        const response = await fetch(`${baseUrl}/api/health`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' });
    });

    await t.test('GET /api/productos devuelve una lista', async () => {
        const response = await fetch(`${baseUrl}/api/productos`);
        assert.equal(response.status, 200);
        assert.ok(Array.isArray(await response.json()));
    });

    await t.test('GET /api/health devuelve 503 cuando PostgreSQL falla', async () => {
        const originalQuery = pool.query;
        pool.query = async () => { throw Object.assign(new Error('No disponible'), { code: 'ECONNREFUSED' }); };
        try {
            const response = await fetch(`${baseUrl}/api/health`);
            assert.equal(response.status, 503);
            assert.deepEqual(await response.json(), { status: 'error', database: 'unavailable' });
        } finally {
            pool.query = originalQuery;
        }
    });
});
