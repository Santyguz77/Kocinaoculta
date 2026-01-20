import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos
app.use(express.static(__dirname));

// Servir manifest.json
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(join(__dirname, 'manifest.json'));
});

// Servir service worker
app.get('/service-worker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(join(__dirname, 'service-worker.js'));
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🍽️ Servidor de Restaurante funcionando correctamente");
});

// Conexión con la base de datos SQLite
const db = await open({
  filename: "./restaurante.db",
  driver: sqlite3.Database
});

// Crear tablas si no existen
await db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS tables (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS waiters (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS cash_closures (id TEXT PRIMARY KEY, data TEXT);
`);

// Tablas permitidas
const ALLOWED_TABLES = new Set([
  "menu_items",
  "tables",
  "orders",
  "transactions",
  "waiters",
  "config",
  "cash_closures"
]);

// Obtener todos los registros
app.get("/api/:table", async (req, res) => {
  const { table } = req.params;
  try {
    if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ error: "Tabla no permitida" });
    const rows = await db.all(`SELECT * FROM ${table}`);
    res.json(rows.map(r => JSON.parse(r.data)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Guardar lista completa (reemplaza todo)
app.post("/api/:table", async (req, res) => {
  const { table } = req.params;
  const items = req.body;
  if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ error: "Tabla no permitida" });
  if (!Array.isArray(items)) return res.status(400).json({ error: "Formato inválido" });
  try {
    await db.exec("BEGIN");
    await db.run(`DELETE FROM ${table}`);
    const stmt = await db.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`);
    for (const item of items) {
      await stmt.run(item.id, JSON.stringify(item));
    }
    await stmt.finalize();
    await db.exec("COMMIT");
    res.json({ success: true, count: items.length });
  } catch (err) {
    try { await db.exec("ROLLBACK"); } catch {}
    res.status(500).json({ error: err.message });
  }
});

// Actualizar/crear UN SOLO registro
app.put("/api/:table/:id", async (req, res) => {
  const { table, id } = req.params;
  const item = req.body;
  if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ error: "Tabla no permitida" });
  if (!item || !item.id) return res.status(400).json({ error: "Item inválido" });
  try {
    await db.run(
      `INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`,
      id,
      JSON.stringify(item)
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar UN SOLO registro
app.delete("/api/:table/:id", async (req, res) => {
  const { table, id } = req.params;
  if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ error: "Tabla no permitida" });
  try {
    await db.run(`DELETE FROM ${table} WHERE id = ?`, id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`✅ API de Restaurante v1.0.1 corriendo en puerto ${PORT}`));
