import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3006;
const databaseUrl = process.env.DATABASE_URL;
const { Pool } = pg;

const pool = new Pool({
  connectionString: databaseUrl
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

async function query(text, params = []) {
  return pool.query(text, params);
}

async function waitForDatabase(retries = 20) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`Waiting for doctors database... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();

  await query(`
    CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(120),
      phone VARCHAR(30),
      specialty VARCHAR(120),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await query("SELECT COUNT(*) FROM doctors");
  if (Number(existing.rows[0].count) === 0) {
    await query(
      `INSERT INTO doctors (name, email, phone, specialty)
       VALUES
        ($1, $2, $3, $4),
        ($5, $6, $7, $8),
        ($9, $10, $11, $12)`,
      [
        "Dra. Rivera",
        "rivera@clinica.test",
        "555-0102",
        "Odontologia general",
        "Dr. Torres",
        "torres@clinica.test",
        "555-0103",
        "Endodoncia",
        "Dra. Lopez",
        "lopez@clinica.test",
        "555-0104",
        "Ortodoncia"
      ]
    );
  }
}

function mapDoctor(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    specialty: row.specialty,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

app.get("/health", async (_req, res, next) => {
  try {
    await query("SELECT 1");
    res.json({ service: "doctors-service", status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.get("/", async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const queryString = includeInactive
      ? "SELECT * FROM doctors ORDER BY id ASC"
      : "SELECT * FROM doctors WHERE active = TRUE ORDER BY id ASC";
    const result = await query(queryString);
    res.json(result.rows.map(mapDoctor));
  } catch (error) {
    next(error);
  }
});

app.get("/:id", async (req, res, next) => {
  try {
    const doctorId = Number(req.params.id);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "ID de doctor inválido" });
    }

    const result = await query("SELECT * FROM doctors WHERE id = $1", [doctorId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Doctor no encontrado" });
    }

    res.json(mapDoctor(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post("/", async (req, res, next) => {
  try {
    const { name, email, phone, specialty, active } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "El campo 'name' es obligatorio" });
    }

    if (!specialty || typeof specialty !== "string" || !specialty.trim()) {
      return res.status(400).json({ error: "El campo 'specialty' es obligatorio" });
    }

    const isActive = active !== undefined ? Boolean(active) : true;

    const result = await query(
      `INSERT INTO doctors (name, email, phone, specialty, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name.trim(),
        email && typeof email === "string" ? email.trim() : null,
        phone && typeof phone === "string" ? phone.trim() : null,
        specialty.trim(),
        isActive
      ]
    );

    res.status(201).json(mapDoctor(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put("/:id", async (req, res, next) => {
  try {
    const doctorId = Number(req.params.id);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "ID de doctor inválido" });
    }

    const existing = await query("SELECT * FROM doctors WHERE id = $1", [doctorId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Doctor no encontrado" });
    }

    const current = existing.rows[0];
    const { name, email, phone, specialty, active } = req.body || {};

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ error: "El campo 'name' no puede estar vacío" });
    }

    if (specialty !== undefined && (typeof specialty !== "string" || !specialty.trim())) {
      return res.status(400).json({ error: "El campo 'specialty' no puede estar vacío" });
    }

    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedSpecialty = specialty !== undefined ? specialty.trim() : current.specialty;
    const updatedEmail = email !== undefined ? (email ? email.trim() : null) : current.email;
    const updatedPhone = phone !== undefined ? (phone ? phone.trim() : null) : current.phone;
    const updatedActive = active !== undefined ? Boolean(active) : current.active;

    const result = await query(
      `UPDATE doctors
       SET name = $1,
           email = $2,
           phone = $3,
           specialty = $4,
           active = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [updatedName, updatedEmail, updatedPhone, updatedSpecialty, updatedActive, doctorId]
    );

    res.json(mapDoctor(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.delete("/:id", async (req, res, next) => {
  try {
    const doctorId = Number(req.params.id);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "ID de doctor inválido" });
    }

    const result = await query(
      `UPDATE doctors
       SET active = FALSE,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [doctorId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Doctor no encontrado" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Error interno en doctors-service" });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`doctors-service running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize doctors-service database", error);
    process.exit(1);
  });
