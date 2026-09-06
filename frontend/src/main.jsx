import React from "react";
import { createRoot } from "react-dom/client";
import { Activity, CalendarDays, CreditCard, LayoutDashboard, Stethoscope, UserRound } from "lucide-react";
import "./styles.css";

const patients = [
  { id: 1, name: "Ana Martinez", phone: "555-0101", alert: "Alergia a penicilina", balance: 2800 },
  { id: 2, name: "Carlos Ruiz", phone: "555-0188", alert: "Hipertension", balance: 0 },
  { id: 3, name: "Sofia Herrera", phone: "555-0145", alert: "Sin alertas", balance: 850 }
];

const appointments = [
  { time: "09:00", patient: "Sofia Herrera", doctor: "Dra. Rivera", room: "Cubiculo 1", status: "Llego" },
  { time: "10:30", patient: "Ana Martinez", doctor: "Dra. Rivera", room: "Cubiculo 1", status: "Espera" },
  { time: "12:00", patient: "Carlos Ruiz", doctor: "Dr. Torres", room: "Cubiculo 2", status: "Falto" }
];

const teeth = Array.from({ length: 32 }, (_, index) => {
  const id = index + 1;
  const states = ["Sano", "Sano", "Sano", "Caries", "Endodoncia"];
  return { id, state: states[index % states.length] };
});

function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Stethoscope size={28} />
          <div>
            <strong>ProyectoMoviles</strong>
            <span>Clinica odontologica</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegacion principal">
          <a href="#dashboard"><LayoutDashboard size={18} />Dashboard</a>
          <a href="#patients"><UserRound size={18} />Pacientes</a>
          <a href="#appointments"><CalendarDays size={18} />Agenda</a>
          <a href="#odontogram"><Activity size={18} />Odontograma</a>
          <a href="#billing"><CreditCard size={18} />Pagos</a>
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p>Administrador</p>
            <h1>Panel de clinica odontologica</h1>
          </div>
          <button type="button">Nueva cita</button>
        </header>

        <section id="dashboard" className="metrics-grid" aria-label="Indicadores principales">
          <Metric label="Citas de hoy" value="12" />
          <Metric label="Pacientes activos" value="128" />
          <Metric label="Pagos pendientes" value="$3,650" />
          <Metric label="Alertas medicas" value="4" />
        </section>

        <section id="patients" className="panel">
          <div className="section-heading">
            <h2>Pacientes</h2>
            <button type="button">Registrar paciente</button>
          </div>
          <div className="table">
            <div className="table-row table-head">
              <span>Nombre</span>
              <span>Telefono</span>
              <span>Alerta medica</span>
              <span>Saldo</span>
            </div>
            {patients.map((patient) => (
              <div className="table-row" key={patient.id}>
                <span>{patient.name}</span>
                <span>{patient.phone}</span>
                <span className={patient.alert === "Sin alertas" ? "muted" : "danger"}>{patient.alert}</span>
                <span>{patient.balance ? `$${patient.balance}` : "Pagado"}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="appointments" className="panel">
          <div className="section-heading">
            <h2>Agenda diaria</h2>
            <div className="legend">
              <span className="dot arrived"></span>Llego
              <span className="dot waiting"></span>Espera
              <span className="dot missed"></span>Falto
            </div>
          </div>
          <div className="appointments">
            {appointments.map((appointment) => (
              <article className={`appointment ${statusClass(appointment.status)}`} key={`${appointment.time}-${appointment.patient}`}>
                <strong>{appointment.time}</strong>
                <span>{appointment.patient}</span>
                <small>{appointment.doctor} / {appointment.room}</small>
              </article>
            ))}
          </div>
        </section>

        <section id="odontogram" className="panel">
          <div className="section-heading">
            <h2>Odontograma</h2>
            <select aria-label="Paciente del odontograma">
              <option>Ana Martinez</option>
              <option>Carlos Ruiz</option>
              <option>Sofia Herrera</option>
            </select>
          </div>
          <div className="odontogram-grid">
            {teeth.map((tooth) => (
              <button className={`tooth ${tooth.state.toLowerCase()}`} type="button" key={tooth.id} title={`Diente ${tooth.id}: ${tooth.state}`}>
                <span>{tooth.id}</span>
              </button>
            ))}
          </div>
        </section>

        <section id="billing" className="panel">
          <div className="section-heading">
            <h2>Presupuesto y pagos</h2>
            <button type="button">Generar presupuesto</button>
          </div>
          <div className="billing-summary">
            <div>
              <span>Tratamiento</span>
              <strong>Endodoncia + limpieza</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>$3,800</strong>
            </div>
            <div>
              <span>Pagado</span>
              <strong>$1,000</strong>
            </div>
            <div>
              <span>Saldo</span>
              <strong>$2,800</strong>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function statusClass(status) {
  return {
    Llego: "arrived",
    Espera: "waiting",
    Falto: "missed"
  }[status] || "waiting";
}

createRoot(document.getElementById("root")).render(<App />);
