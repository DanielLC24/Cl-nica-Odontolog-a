import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3007;
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
      console.log(`Waiting for inventory database... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();

  await query(`
    CREATE TABLE IF NOT EXISTS supplies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      minimum_stock INTEGER NOT NULL DEFAULT 10,
      unit VARCHAR(50),
      supplier_id INTEGER,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(30),
      email VARCHAR(120),
      address VARCHAR(255),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const suppliersExisting = await query("SELECT COUNT(*) FROM suppliers");
  if (Number(suppliersExisting.rows[0].count) === 0) {
    await query(
      `INSERT INTO suppliers (name, phone, email, address)
       VALUES
        ($1, $2, $3, $4),
        ($5, $6, $7, $8),
        ($9, $10, $11, $12)`,
      [
        "Proveedor Dental Premium",
        "555-2001",
        "contact@premiumdental.test",
        "Calle Dental 123",
        "Suministros Clínicos S.A.",
        "555-2002",
        "info@suministros-clinicos.test",
        "Avenida Médica 456",
        "Distribuidora Odontológica",
        "555-2003",
        "ventas@distrib-odonto.test",
        "Carrera Clínica 789"
      ]
    );
  }

  const suppliesExisting = await query("SELECT COUNT(*) FROM supplies");
  if (Number(suppliesExisting.rows[0].count) === 0) {
    await query(
      `INSERT INTO supplies (name, stock, minimum_stock, unit, supplier_id)
       VALUES
        ($1, $2, $3, $4, $5),
        ($6, $7, $8, $9, $10),
        ($11, $12, $13, $14, $15),
        ($16, $17, $18, $19, $20),
        ($21, $22, $23, $24, $25)`,
      [
        "Amalgama",
        50,
        20,
        "unidades",
        1,
        "Resina Composite",
        100,
        30,
        "jeringas",
        1,
        "Gutapercha",
        75,
        25,
        "conos",
        2,
        "Hilo Dental",
        200,
        50,
        "carretes",
        2,
        "Anestésico Local",
        120,
        40,
        "cartuchos",
        3
      ]
    );
  }
}

function mapSupply(row) {
  return {
    id: row.id,
    name: row.name,
    stock: row.stock,
    minimumStock: row.minimum_stock,
    unit: row.unit,
    supplierId: row.supplier_id,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSupplier(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ========== HEALTH CHECK ==========

app.get("/health", async (_req, res, next) => {
  try {
    await query("SELECT 1");
    res.json({ service: "inventory-service", status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ service: "inventory-service", status: "error" });
  }
});

// ========== SUPPLIES ENDPOINTS ==========

app.get("/supplies", async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";
    const result = await query(
      includeInactive
        ? "SELECT * FROM supplies ORDER BY active DESC, id ASC"
        : "SELECT * FROM supplies WHERE active = true ORDER BY id ASC"
    );
    res.json(result.rows.map(mapSupply));
  } catch (error) {
    console.error("Error fetching supplies:", error);
    res.status(500).json({ error: "Error fetching supplies" });
  }
});

app.get("/supplies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM supplies WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supply not found" });
    }

    res.json(mapSupply(result.rows[0]));
  } catch (error) {
    console.error("Error fetching supply:", error);
    res.status(500).json({ error: "Error fetching supply" });
  }
});

app.post("/supplies", async (req, res) => {
  try {
    const { name, stock, minimumStock, unit, supplierId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = await query(
      `INSERT INTO supplies (name, stock, minimum_stock, unit, supplier_id, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING *`,
      [name, stock || 0, minimumStock || 10, unit || null, supplierId || null]
    );

    res.status(201).json(mapSupply(result.rows[0]));
  } catch (error) {
    console.error("Error creating supply:", error);
    res.status(500).json({ error: "Error creating supply" });
  }
});

app.put("/supplies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stock, minimumStock, unit, supplierId, active } = req.body;

    const updateFields = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      params.push(name);
      paramCount += 1;
    }
    if (stock !== undefined) {
      updateFields.push(`stock = $${paramCount}`);
      params.push(stock);
      paramCount += 1;
    }
    if (minimumStock !== undefined) {
      updateFields.push(`minimum_stock = $${paramCount}`);
      params.push(minimumStock);
      paramCount += 1;
    }
    if (unit !== undefined) {
      updateFields.push(`unit = $${paramCount}`);
      params.push(unit);
      paramCount += 1;
    }
    if (supplierId !== undefined) {
      updateFields.push(`supplier_id = $${paramCount}`);
      params.push(supplierId);
      paramCount += 1;
    }
    if (active !== undefined) {
      updateFields.push(`active = $${paramCount}`);
      params.push(active);
      paramCount += 1;
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);

    const result = await query(
      `UPDATE supplies SET ${updateFields.join(", ")} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supply not found" });
    }

    res.json(mapSupply(result.rows[0]));
  } catch (error) {
    console.error("Error updating supply:", error);
    res.status(500).json({ error: "Error updating supply" });
  }
});

app.patch("/supplies/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      "UPDATE supplies SET active = false, updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supply not found" });
    }

    res.json(mapSupply(result.rows[0]));
  } catch (error) {
    console.error("Error deactivating supply:", error);
    res.status(500).json({ error: "Error deactivating supply" });
  }
});

app.delete("/supplies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM supplies WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supply not found" });
    }

    res.json({ message: "Supply deleted", supply: mapSupply(result.rows[0]) });
  } catch (error) {
    console.error("Error deleting supply:", error);
    res.status(500).json({ error: "Error deleting supply" });
  }
});

app.patch("/supplies/:id/update-stock", async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      return res.status(400).json({ error: "Stock value is required" });
    }

    const result = await query(
      "UPDATE supplies SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [stock, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supply not found" });
    }

    res.json(mapSupply(result.rows[0]));
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ error: "Error updating stock" });
  }
});

// ========== SUPPLIERS ENDPOINTS ==========

app.get("/suppliers", async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";
    const result = await query(
      includeInactive
        ? "SELECT * FROM suppliers ORDER BY active DESC, id ASC"
        : "SELECT * FROM suppliers WHERE active = true ORDER BY id ASC"
    );
    res.json(result.rows.map(mapSupplier));
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Error fetching suppliers" });
  }
});

app.get("/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM suppliers WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    res.json(mapSupplier(result.rows[0]));
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ error: "Error fetching supplier" });
  }
});

app.post("/suppliers", async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = await query(
      `INSERT INTO suppliers (name, phone, email, address, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING *`,
      [name, phone || null, email || null, address || null]
    );

    res.status(201).json(mapSupplier(result.rows[0]));
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Error creating supplier" });
  }
});

app.put("/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, active } = req.body;

    const updateFields = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      params.push(name);
      paramCount += 1;
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      params.push(phone);
      paramCount += 1;
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramCount}`);
      params.push(email);
      paramCount += 1;
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCount}`);
      params.push(address);
      paramCount += 1;
    }
    if (active !== undefined) {
      updateFields.push(`active = $${paramCount}`);
      params.push(active);
      paramCount += 1;
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);

    const result = await query(
      `UPDATE suppliers SET ${updateFields.join(", ")} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    res.json(mapSupplier(result.rows[0]));
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Error updating supplier" });
  }
});

app.patch("/suppliers/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      "UPDATE suppliers SET active = false, updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    res.json(mapSupplier(result.rows[0]));
  } catch (error) {
    console.error("Error deactivating supplier:", error);
    res.status(500).json({ error: "Error deactivating supplier" });
  }
});

app.delete("/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query("SELECT * FROM suppliers WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    await query(
      "UPDATE supplies SET supplier_id = NULL, updated_at = NOW() WHERE supplier_id = $1",
      [id]
    );

    const result = await query("DELETE FROM suppliers WHERE id = $1 RETURNING *", [id]);
    res.json({ message: "Supplier deleted", supplier: mapSupplier(result.rows[0]) });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Error deleting supplier" });
  }
});

// ========== STARTUP ==========

await initializeDatabase();

app.listen(port, () => {
  console.log(`inventory-service running on port ${port}`);
});
