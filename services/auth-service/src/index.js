import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import morgan from "morgan";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const demoUsers = [
  { id: 1, name: "Administrador", email: "admin@clinicadental.test", password: "admin123", role: "ADMIN" },
  { id: 2, name: "Doctora Dental", email: "doctor@clinicadental.test", password: "doctor123", role: "DOCTOR" },
  { id: 3, name: "Recepcion", email: "recepcion@clinicadental.test", password: "recepcion123", role: "RECEPCIONISTA" }
];

app.get("/health", (_req, res) => {
  res.json({ service: "auth-service", status: "ok" });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = demoUsers.find((item) => item.email === email && item.password === password);

  if (!user) {
    return res.status(401).json({ message: "Credenciales invalidas" });
  }

  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: "2h" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/roles", (_req, res) => {
  res.json(["ADMIN", "DOCTOR", "RECEPCIONISTA"]);
});

app.listen(port, () => {
  console.log(`auth-service running on port ${port}`);
});
