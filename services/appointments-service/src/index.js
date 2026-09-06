import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";

dotenv.config();

const app = express();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const appointments = [
  { id: 1, patientId: 1, patientName: "Ana Martinez", doctor: "Dra. Rivera", room: "Cubiculo 1", date: "2026-09-07", time: "10:00", status: "EN_ESPERA" },
  { id: 2, patientId: 2, patientName: "Carlos Ruiz", doctor: "Dr. Torres", room: "Cubiculo 2", date: "2026-09-07", time: "12:30", status: "CONFIRMADA" }
];

app.get("/health", (_req, res) => {
  res.json({ service: "appointments-service", status: "ok" });
});

app.get("/", (_req, res) => {
  res.json(appointments);
});

app.post("/", (req, res) => {
  const appointment = { id: appointments.length + 1, status: "CONFIRMADA", ...req.body };
  appointments.push(appointment);
  res.status(201).json(appointment);
});

app.patch("/:id/status", (req, res) => {
  const appointment = appointments.find((item) => item.id === Number(req.params.id));
  if (!appointment) {
    return res.status(404).json({ message: "Cita no encontrada" });
  }

  appointment.status = req.body.status;
  res.json(appointment);
});

app.listen(port, () => {
  console.log(`appointments-service running on port ${port}`);
});
