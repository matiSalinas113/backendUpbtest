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

    await t.test('CRUD completo, busqueda literal sin distinguir mayusculas y CORS Firebase', async () => {
        let id;
        const nombre = `Presentacion_${Date.now()}_%`;
        const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        try {
            const created = await fetch(`${baseUrl}/api/productos`, json('POST', { nombre, precio: 25.5, stock: 4 }));
            assert.equal(created.status, 201);
            const producto = await created.json();
            id = producto.id;
            assert.equal(producto.nombre, nombre);
            const detail = await fetch(`${baseUrl}/api/productos/${id}`);
            assert.equal(detail.status, 200);
            assert.equal((await detail.json()).precio, 25.5);
            const search = await fetch(`${baseUrl}/api/productos?nombre=${encodeURIComponent(nombre.toLowerCase())}`);
            assert.equal(search.status, 200);
            assert.deepEqual((await search.json()).map(p => p.id), [id]);
            const empty = await fetch(`${baseUrl}/api/productos?nombre=${encodeURIComponent(nombre + '_inexistente')}`);
            assert.deepEqual(await empty.json(), []);
            const invalidSearch = await fetch(`${baseUrl}/api/productos?nombre=a&nombre=b`);
            assert.equal(invalidSearch.status, 400);
            const update = await fetch(`${baseUrl}/api/productos/${id}`, json('PUT', { precio: 0, stock: 0 }));
            assert.equal(update.status, 200);
            const updated = await update.json();
            assert.equal(updated.nombre, nombre);
            assert.equal(updated.precio, 0);
            assert.equal(updated.stock, 0);
            const invalid = await fetch(`${baseUrl}/api/productos`, json('POST', { nombre: '', precio: -1 }));
            assert.equal(invalid.status, 400);
            const preflight = await fetch(`${baseUrl}/api/productos/${id}`, {
                method: 'OPTIONS',
                headers: { Origin: 'https://upbtest2-cedbe.web.app', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' },
            });
            assert.equal(preflight.status, 204);
            assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
            assert.match(preflight.headers.get('access-control-allow-methods'), /PUT/);
            const removed = await fetch(`${baseUrl}/api/productos/${id}`, { method: 'DELETE' });
            assert.equal(removed.status, 204);
            assert.equal((await fetch(`${baseUrl}/api/productos/${id}`)).status, 404);
            id = undefined;
        } finally {
            if (id) await pool.query('DELETE FROM productos WHERE id = $1', [id]);
        }
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
