import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";
const { Pool } = pg;

const pool = new Pool({
  connectionString: databaseUrl
});

const demoUsers = [
  { name: "Administrador", email: "admin@clinica.test", password: "admin123", role: "ADMIN" },
  { name: "Doctora Dental", email: "doctor@clinica.test", password: "doctor123", role: "DOCTOR" },
  { name: "Recepcion", email: "recepcion@clinica.test", password: "recepcion123", role: "RECEPCIONISTA" }
];

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
      console.log(`Waiting for auth database... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(40) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  for (const user of demoUsers) {
    const existing = await query("SELECT id FROM users WHERE email = $1", [user.email]);
    if (existing.rowCount === 0) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)`,
        [user.name, user.email, passwordHash, user.role]
      );
    }
  }
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

app.get("/health", async (_req, res, next) => {
  try {
    await query("SELECT 1");
    res.json({ service: "auth-service", status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await query("SELECT * FROM users WHERE email = $1 AND active = TRUE", [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: "2h" });
    res.json({ token, user: mapUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/roles", (_req, res) => {
  res.json(["ADMIN", "DOCTOR", "RECEPCIONISTA"]);
});

app.get("/users", async (_req, res, next) => {
  try {
    const result = await query("SELECT * FROM users ORDER BY id ASC");
    res.json(result.rows.map(mapUser));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Error interno en auth-service" });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`auth-service running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize auth-service database", error);
    process.exit(1);
  });
