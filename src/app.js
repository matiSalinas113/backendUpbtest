const pool = require('./config/db');
const express = require('express');
const cors = require('cors');
const productoRoutes = require('./routes/producto.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API backendUpb funcionando');
});

app.use('/api/productos', productoRoutes);

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores: HttpError usa su status, cualquier otro error es 500
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'JSON inválido' });
    }
    if (err.status) {
        return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const port = process.env.PORT || 3000;

async function iniciar() {
    try {
        await pool.query('SELECT 1');
        await pool.query('SELECT id, nombre, precio, stock, created_at FROM productos LIMIT 0');
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('No se pudo iniciar la API: PostgreSQL no esta disponible o falta la tabla productos.');
        console.error('Codigo:', err.code || 'desconocido');
        if (err.code === 'ENOTFOUND') {
            console.error('No se pudo resolver el host de DATABASE_URL. Revisa el .env guardado en la raiz del proyecto.');
        } else if (err.code === '42P01') {
            console.error('Ejecuta npm run db:init para crear la tabla productos.');
        }
        await pool.end();
        process.exitCode = 1;
    }
}

iniciar();
