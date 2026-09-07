import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, CalendarDays, CreditCard, LayoutDashboard, Stethoscope, UserRound } from "lucide-react";
import "./styles.css";

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

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "patients", label: "Pacientes", icon: UserRound },
  { key: "appointments", label: "Agenda", icon: CalendarDays },
  { key: "odontogram", label: "Odontograma", icon: Activity },
  { key: "billing", label: "Pagos", icon: CreditCard }
];

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  birthDate: "",
  address: "",
  medicalAlerts: ""
};

const validCredentials = {
  "admin@clinica.test": "admin123",
  "doctor@clinica.test": "doctor123",
  "recepcion@clinica.test": "recepcion123"
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("Administrador");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loginForm, setLoginForm] = useState({ email: "admin@clinica.test", password: "admin123" });
  const [loginError, setLoginError] = useState("");
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formState, setFormState] = useState(emptyForm);
  const [savingPatient, setSavingPatient] = useState(false);

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await fetch("http://localhost:3000/api/patients");
      if (!response.ok) {
        throw new Error("No se pudo cargar la lista de pacientes");
      }
      const data = await response.json();
      setPatients(data);
      if (data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
      if (data.length === 0) {
        setSelectedPatientId(null);
      }
    } catch (error) {
      console.error(error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeSection === "patients") {
      fetchPatients();
    }
  }, [isLoggedIn, activeSection]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) {
      return patients;
    }

    return patients.filter((patient) => {
      const text = `${patient.fullName || ""} ${patient.phone || ""} ${patient.email || ""}`.toLowerCase();
      return text.includes(searchTerm.toLowerCase());
    });
  }, [patients, searchTerm]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || filteredPatients[0] || null,
    [patients, filteredPatients, selectedPatientId]
  );

  useEffect(() => {
    if (selectedPatient && !filteredPatients.some((patient) => patient.id === selectedPatient.id)) {
      setSelectedPatientId(filteredPatients[0]?.id || null);
    }
  }, [filteredPatients, selectedPatient]);

  const handleLogin = (event) => {
    event.preventDefault();
    const { email, password } = loginForm;

    if (validCredentials[email] === password) {
      const roleMap = {
        "admin@clinica.test": "Administrador",
        "doctor@clinica.test": "Doctor",
        "recepcion@clinica.test": "Recepcionista"
      };

      setUserRole(roleMap[email]);
      setIsLoggedIn(true);
      setLoginError("");
      return;
    }

    setLoginError("Credenciales incorrectas. Usa uno de los usuarios demo.");
  };

  const openCreateForm = () => {
    setFormMode("create");
    setFormState(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (patient) => {
    setFormMode("edit");
    setFormState({
      fullName: patient.fullName || "",
      phone: patient.phone || "",
      email: patient.email || "",
      birthDate: patient.birthDate || "",
      address: patient.address || "",
      medicalAlerts: Array.isArray(patient.medicalAlerts) ? patient.medicalAlerts.join(", ") : ""
    });
    setSelectedPatientId(patient.id);
    setIsFormOpen(true);
  };

  const handleSavePatient = async (event) => {
    event.preventDefault();
    setSavingPatient(true);

    const payload = {
      fullName: formState.fullName,
      phone: formState.phone,
      email: formState.email,
      birthDate: formState.birthDate || null,
      address: formState.address,
      medicalAlerts: formState.medicalAlerts
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    };

    try {
      const url = formMode === "create"
        ? "http://localhost:3000/api/patients"
        : `http://localhost:3000/api/patients/${selectedPatientId}`;

      const method = formMode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Error al guardar paciente");
      }

      setIsFormOpen(false);
      setFormState(emptyForm);
      await fetchPatients();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingPatient(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">
            <Stethoscope size={30} />
            <div>
              <strong>Clínica Odontológica</strong>
              <span>Panel administrativo</span>
            </div>
          </div>

          <h1>Iniciar sesión</h1>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              Correo electrónico
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                placeholder="admin@clinica.test"
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                placeholder="••••••••"
              />
            </label>

            {loginError ? <p className="login-error">{loginError}</p> : null}

            <button type="submit" className="login-button">Entrar</button>
          </form>

          <div className="demo-users">
            <p>Usuarios demo:</p>
            <ul>
              <li>admin@clinica.test / admin123</li>
              <li>doctor@clinica.test / doctor123</li>
              <li>recepcion@clinica.test / recepcion123</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

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
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={activeSection === key ? "nav-item active" : "nav-item"}
              onClick={() => setActiveSection(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p>{userRole}</p>
            <h1>Panel de clinica odontologica</h1>
          </div>
          <button type="button" className="primary-button">Nueva cita</button>
        </header>

        {activeSection === "dashboard" && (
          <>
            <section className="metrics-grid" aria-label="Indicadores principales">
              <Metric label="Citas de hoy" value="12" />
              <Metric label="Pacientes activos" value="128" />
              <Metric label="Pagos pendientes" value="$3,650" />
              <Metric label="Alertas medicas" value="4" />
            </section>

            <section className="panel">
              <div className="section-heading">
                <h2>Resumen operativo</h2>
              </div>
              <div className="billing-summary">
                <div>
                  <span>Doctores activos</span>
                  <strong>5</strong>
                </div>
                <div>
                  <span>Cubículos</span>
                  <strong>3</strong>
                </div>
                <div>
                  <span>Recordatorios</span>
                  <strong>18</strong>
                </div>
                <div>
                  <span>Corte de caja</span>
                  <strong>$12,400</strong>
                </div>
              </div>
            </section>
          </>
        )}

        {activeSection === "patients" && (
          <section className="panel patients-panel">
            <div className="section-heading">
              <h2>Pacientes</h2>
              <button type="button" className="primary-button" onClick={openCreateForm}>Registrar paciente</button>
            </div>

            <div className="patient-toolbar">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar paciente..."
                aria-label="Buscar paciente"
              />
            </div>

            <div className="patients-layout">
              <div className="patient-list-card">
                {loadingPatients ? (
                  <p>Cargando pacientes...</p>
                ) : filteredPatients.length === 0 ? (
                  <p>No hay pacientes que coincidan con la búsqueda.</p>
                ) : (
                  <div className="table">
                    <div className="table-row table-head">
                      <span>Nombre</span>
                      <span>Teléfono</span>
                      <span>Alertas</span>
                    </div>
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className={selectedPatient?.id === patient.id ? "patient-row active" : "patient-row"}
                        onClick={() => setSelectedPatientId(patient.id)}
                      >
                        <span>{patient.fullName}</span>
                        <span>{patient.phone}</span>
                        <span className={patient.medicalAlerts?.length ? "danger" : "muted"}>
                          {patient.medicalAlerts?.length ? patient.medicalAlerts.join(", ") : "Sin alertas"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="patient-profile-card">
                {selectedPatient ? (
                  <>
                    <div className="profile-header">
                      <div>
                        <p className="badge">Paciente</p>
                        <h3>{selectedPatient.fullName}</h3>
                      </div>
                      <button type="button" className="secondary-button" onClick={() => openEditForm(selectedPatient)}>
                        Editar
                      </button>
                    </div>

                    <div className="profile-grid">
                      <div>
                        <span>Teléfono</span>
                        <strong>{selectedPatient.phone}</strong>
                      </div>
                      <div>
                        <span>Correo</span>
                        <strong>{selectedPatient.email || "No registrado"}</strong>
                      </div>
                      <div>
                        <span>Fecha de nacimiento</span>
                        <strong>{selectedPatient.birthDate || "No registrada"}</strong>
                      </div>
                      <div>
                        <span>Dirección</span>
                        <strong>{selectedPatient.address || "No registrada"}</strong>
                      </div>
                    </div>

                    <div className="profile-alerts">
                      <h4>Alertas médicas</h4>
                      <ul>
                        {selectedPatient.medicalAlerts?.length ? (
                          selectedPatient.medicalAlerts.map((alert) => <li key={alert}>{alert}</li>)
                        ) : (
                          <li>Sin alertas</li>
                        )}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p>Selecciona un paciente para ver su perfil.</p>
                )}
              </div>
            </div>

            {isFormOpen && (
              <div className="modal-backdrop">
                <div className="modal-card">
                  <div className="section-heading">
                    <h3>{formMode === "create" ? "Nuevo paciente" : "Editar paciente"}</h3>
                    <button type="button" className="close-button" onClick={() => setIsFormOpen(false)}>Cerrar</button>
                  </div>

                  <form className="patient-form" onSubmit={handleSavePatient}>
                    <label>
                      Nombre completo
                      <input
                        value={formState.fullName}
                        onChange={(event) => setFormState({ ...formState, fullName: event.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Teléfono
                      <input
                        value={formState.phone}
                        onChange={(event) => setFormState({ ...formState, phone: event.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Correo
                      <input
                        type="email"
                        value={formState.email}
                        onChange={(event) => setFormState({ ...formState, email: event.target.value })}
                      />
                    </label>
                    <label>
                      Fecha de nacimiento
                      <input
                        type="date"
                        value={formState.birthDate}
                        onChange={(event) => setFormState({ ...formState, birthDate: event.target.value })}
                      />
                    </label>
                    <label>
                      Dirección
                      <input
                        value={formState.address}
                        onChange={(event) => setFormState({ ...formState, address: event.target.value })}
                      />
                    </label>
                    <label>
                      Alertas médicas
                      <input
                        value={formState.medicalAlerts}
                        onChange={(event) => setFormState({ ...formState, medicalAlerts: event.target.value })}
                        placeholder="Alergia a penicilina, hipertensión"
                      />
                    </label>

                    <div className="form-actions">
                      <button type="button" className="secondary-button" onClick={() => setIsFormOpen(false)}>Cancelar</button>
                      <button type="submit" className="primary-button" disabled={savingPatient}>
                        {savingPatient ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "appointments" && (
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
        )}

        {activeSection === "odontogram" && (
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
        )}

        {activeSection === "billing" && (
          <section id="billing" className="panel">
            <div className="section-heading">
              <h2>Presupuesto y pagos</h2>
              <button type="button" className="primary-button">Generar presupuesto</button>
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
        )}
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
