import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, CalendarDays, CreditCard, LayoutDashboard, Stethoscope, UserRound } from "lucide-react";
import "./styles.css";

const toothNames = {
  1: "Inc. Central",
  2: "Inc. Lateral",
  3: "Canino",
  4: "1er Premolar",
  5: "2do Premolar",
  6: "1er Molar",
  7: "2do Molar",
  8: "3er Molar",
  9: "3er Molar",
  10: "2do Molar",
  11: "1er Molar",
  12: "2do Premolar",
  13: "1er Premolar",
  14: "Canino",
  15: "Inc. Lateral",
  16: "Inc. Central",
  17: "Inc. Central",
  18: "Inc. Lateral",
  19: "Canino",
  20: "1er Premolar",
  21: "2do Premolar",
  22: "1er Molar",
  23: "2do Molar",
  24: "3er Molar",
  25: "3er Molar",
  26: "2do Molar",
  27: "1er Molar",
  28: "2do Premolar",
  29: "1er Premolar",
  30: "Canino",
  31: "Inc. Lateral",
  32: "Inc. Central"
};

const teeth = Array.from({ length: 32 }, (_, index) => {
  const id = index + 1;
  const states = ["Sano", "Sano", "Sano", "Caries", "Endodoncia"];
  return { id, state: states[index % states.length], name: toothNames[id] };
});

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "patients", label: "Pacientes", icon: UserRound },
  { key: "appointments", label: "Agenda", icon: CalendarDays },
  { key: "doctors", label: "Doctores", icon: Stethoscope },
  { key: "odontogram", label: "Odontograma", icon: Activity },
  { key: "billing", label: "Pagos", icon: CreditCard }
];

const temporaryCubicles = [
  { id: 1, name: "Cubiculo 1" },
  { id: 2, name: "Cubiculo 2" },
  { id: 3, name: "Cubiculo 3" }
];

const appointmentStatuses = ["EN_ESPERA", "LLEGO", "FALTO"];
const clinicTimeZone = "America/Mexico_City";
const appointmentTimes = Array.from({ length: 49 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});
const appointmentWeekdays = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  birthDate: "",
  address: "",
  medicalAlerts: ""
};

const emptyClinicalRecordForm = {
  reasonForVisit: "",
  diagnosis: "",
  observations: "",
  allergies: "",
  chronicConditions: "",
  currentMedications: ""
};

const emptyAppointmentForm = {
  patientId: "",
  doctorId: "",
  cubicleId: "",
  date: "",
  time: "",
  reason: "",
  observations: "",
  status: "EN_ESPERA"
};

const emptyDoctorForm = {
  name: "",
  specialty: "",
  email: "",
  phone: ""
};

const odontogramStatuses = ["SANO", "CARIES", "ENDODONCIA", "EXTRACCION"];

function formatDoctorPhoneInput(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 10)}`;
}

function formatDoctorTablePhone(phone) {
  if (!phone) return "No registrado";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 10)}`;
  }
  return phone;
}

const validCredentials = {
  "admin@clinica.test": "admin123",
  "doctor@clinica.test": "doctor123",
  "recepcion@clinica.test": "recepcion123"
};

function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getClinicDateTimeParts() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: clinicTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date()).reduce((parts, part) => {
    parts[part.type] = part.value;
    return parts;
  }, {});
}

function getTodayDateKey() {
  const parts = getClinicDateTimeParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getCurrentTimeKey() {
  const parts = getClinicDateTimeParts();
  return `${parts.hour}:${parts.minute}`;
}

function formatAppointmentDate(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${month}/${day}/${year}`;
}

function formatAppointmentTime(time) {
  return time?.slice(0, 5) || "";
}

function formatAppointmentStatus(status) {
  return {
    LLEGO: "Llegó",
    EN_ESPERA: "En espera",
    FALTO: "Faltó",
  }[status] || status;
}

function translateAppointmentSaveError(message) {
  return {
    "El doctor ya tiene una cita en ese horario": "El doctor no está disponible en ese horario.",
    "El cubículo ya está ocupado en ese horario": "El cubículo no está disponible en ese horario.",
    "El doctor ya tiene una cita y el cubículo ya está ocupado en ese horario": "El doctor y el cubículo no están disponibles en ese horario."
  }[message] || message;
}

function normalizeAppointmentStatus(status) {
  return ["LLEGO", "EN_ESPERA", "FALTO"].includes(status) ? status : "EN_ESPERA";
}

function isFutureAppointment(dateKey) {
  return dateKey > getTodayDateKey();
}

function isBeforeAppointmentTime(dateKey, time) {
  return dateKey === getTodayDateKey() && formatAppointmentTime(time) > getCurrentTimeKey();
}

function isPastAppointment(dateKey, time) {
  return dateKey < getTodayDateKey() || (
    dateKey === getTodayDateKey() &&
    formatAppointmentTime(time) < getCurrentTimeKey()
  );
}

function getAllowedAppointmentStatuses(dateKey, time) {
  if (isFutureAppointment(dateKey)) {
    return ["EN_ESPERA"];
  }

  if (isPastAppointment(dateKey, time)) {
    return ["LLEGO", "FALTO"];
  }

  return ["EN_ESPERA", "LLEGO"];
}

function normalizeStatusForAppointment(status, dateKey, time) {
  const allowedStatuses = getAllowedAppointmentStatuses(dateKey, time);
  return allowedStatuses.includes(status) ? status : allowedStatuses[0];
}

function formatAppointmentTimeOption(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatBirthDate(value) {
  if (!value) {
    return "No registrada";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAppointmentConflictMessage(appointments, form, excludedId = null) {
  if (!form.date || !form.time || !form.patientId || !form.doctorId || !form.cubicleId) {
    return "";
  }

  const conflictingAppointments = appointments.filter((appointment) => (
    appointment.id !== excludedId &&
    appointment.date?.slice(0, 10) === form.date &&
    formatAppointmentTime(appointment.time) === form.time
  ));

  const patientConflict = conflictingAppointments.some(
    (appointment) => String(appointment.patientId) === String(form.patientId)
  );
  const doctorConflict = conflictingAppointments.some(
    (appointment) => String(appointment.doctorId) === String(form.doctorId)
  );
  const cubicleConflict = conflictingAppointments.some(
    (appointment) => String(appointment.cubicleId) === String(form.cubicleId)
  );

  if (patientConflict) {
    return "El paciente ya tiene una cita en ese horario.";
  }
  if (doctorConflict && cubicleConflict) {
    return "El doctor ya tiene una cita y el cubículo ya está ocupado en ese horario.";
  }
  if (doctorConflict) {
    return "El doctor ya tiene una cita en ese horario.";
  }
  if (cubicleConflict) {
    return "El cubículo ya está ocupado en ese horario.";
  }

  return "";
}

function getAvailableAppointmentTimes(dateKey) {
  if (dateKey !== getTodayDateKey()) {
    return appointmentTimes;
  }

  const currentTime = getCurrentTimeKey();
  return appointmentTimes.filter((time) => time > currentTime);
}

function getWeekDays(referenceDate) {
  const reference = dateFromKey(referenceDate);
  const dayOfWeek = reference.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - daysFromMonday);

  return appointmentWeekdays.map((label, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return { label, date: dateKeyFromDate(day) };
  });
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("Administrador");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loginForm, setLoginForm] = useState({ email: "admin@clinica.test", password: "admin123" });
  const [loginError, setLoginError] = useState("");
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError] = useState("");
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [doctorModalMode, setDoctorModalMode] = useState("create");
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [deactivatingDoctorId, setDeactivatingDoctorId] = useState(null);
  const [activatingDoctorId, setActivatingDoctorId] = useState(null);
  const [doctorForm, setDoctorForm] = useState(emptyDoctorForm);
  const [doctorFormError, setDoctorFormError] = useState("");
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [doctorSuccessMessage, setDoctorSuccessMessage] = useState("");
  const [appointmentDoctors, setAppointmentDoctors] = useState([]);
  const [loadingAppointmentDoctors, setLoadingAppointmentDoctors] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState(getTodayDateKey);
  const [appointmentView, setAppointmentView] = useState("daily");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [selectedOdontogramPatientId, setSelectedOdontogramPatientId] = useState("");
  const [odontogram, setOdontogram] = useState([]);
  const [loadingOdontogram, setLoadingOdontogram] = useState(false);
  const [savingOdontogramTooth, setSavingOdontogramTooth] = useState(false);
  const [odontogramError, setOdontogramError] = useState("");
  const [treatments, setTreatments] = useState([]);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [budgetsError, setBudgetsError] = useState("");
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ patientId: "", treatments: [] });
  const [budgetFormError, setBudgetFormError] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "" });
  const [paymentFormError, setPaymentFormError] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [isAddTreatmentModalOpen, setIsAddTreatmentModalOpen] = useState(false);
  const [addTreatmentForm, setAddTreatmentForm] = useState({ name: "", price: "" });
  const [addTreatmentFormError, setAddTreatmentFormError] = useState("");
  const [savingAddTreatment, setSavingAddTreatment] = useState(false);
  const [isManageTreatmentsModalOpen, setIsManageTreatmentsModalOpen] = useState(false);
  const [treatmentToDelete, setTreatmentToDelete] = useState(null);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [appointmentFormMode, setAppointmentFormMode] = useState("create");
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState(emptyAppointmentForm);
  const [appointmentFormError, setAppointmentFormError] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState(null);
  const [appointmentDeleteError, setAppointmentDeleteError] = useState("");
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
  const [appointmentStatusError, setAppointmentStatusError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientDetail, setSelectedPatientDetail] = useState(null);
  const [loadingSelectedPatientDetail, setLoadingSelectedPatientDetail] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClinicalRecordFormOpen, setIsClinicalRecordFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formState, setFormState] = useState(emptyForm);
  const [savingPatient, setSavingPatient] = useState(false);
  const [clinicalRecordForm, setClinicalRecordForm] = useState(emptyClinicalRecordForm);
  const [savingClinicalRecord, setSavingClinicalRecord] = useState(false);
  const [, setClockTick] = useState(0);
  const availableAppointmentTimes = getAvailableAppointmentTimes(appointmentForm.date);

  const fetchAppointments = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/appointments");
      if (!response.ok) {
        throw new Error("No se pudieron cargar las citas");
      }

      const data = await response.json();
      setAppointments(data.map((appointment) => ({
        ...appointment,
        status: normalizeAppointmentStatus(appointment.status)
      })));
      setAppointmentsError("");
    } catch (error) {
      console.error(error);
      setAppointments([]);
      setAppointmentsError("No se pudieron cargar las citas. Verifica que el backend este disponible.");
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchTreatments = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/billing/treatments");
      if (!response.ok) {
        throw new Error("No se pudieron cargar los tratamientos");
      }
      const data = await response.json();
      setTreatments(data);
    } catch (error) {
      console.error(error);
      setTreatments([]);
    } finally {
      setLoadingTreatments(false);
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/billing/budgets");
      if (!response.ok) {
        throw new Error("No se pudieron cargar los presupuestos");
      }
      const data = await response.json();
      setBudgets(data);
      setBudgetsError("");
    } catch (error) {
      console.error(error);
      setBudgets([]);
      setBudgetsError("No se pudieron cargar los presupuestos");
    } finally {
      setLoadingBudgets(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    fetchTreatments();
    fetchBudgets();
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setClockTick((tick) => tick + 1), 30000);
    return () => window.clearInterval(clock);
  }, []);

  const filteredAppointments = useMemo(
    () => appointments
      .filter((appointment) => appointment.date?.slice(0, 10) === selectedAppointmentDate)
      .sort((firstAppointment, secondAppointment) => firstAppointment.time.localeCompare(secondAppointment.time)),
    [appointments, selectedAppointmentDate]
  );

  const weeklyAppointments = useMemo(() => {
    const weekDays = getWeekDays(selectedAppointmentDate);
    return weekDays.map((day) => ({
      ...day,
      appointments: appointments
        .filter((appointment) => appointment.date?.slice(0, 10) === day.date)
        .sort((firstAppointment, secondAppointment) => firstAppointment.time.localeCompare(secondAppointment.time))
    }));
  }, [appointments, selectedAppointmentDate]);

  const selectedAppointment = useMemo(
    () => appointments.find((appointment) => appointment.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );

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
      return data;
    } catch (error) {
      console.error(error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchPatientDetail = async (patientId) => {
    if (!patientId) {
      setSelectedPatientDetail(null);
      return;
    }

    setLoadingSelectedPatientDetail(true);
    try {
      const response = await fetch(`http://localhost:3000/api/patients/${patientId}`);
      if (!response.ok) {
        throw new Error("No se pudo cargar el expediente del paciente");
      }

      const patient = await response.json();
      setSelectedPatientDetail(patient);
      setClinicalRecordForm({
        reasonForVisit: patient.clinicalRecord?.reasonForVisit || "",
        diagnosis: patient.clinicalRecord?.diagnosis || "",
        observations: patient.clinicalRecord?.observations || "",
        allergies: patient.clinicalRecord?.allergies || "",
        chronicConditions: patient.clinicalRecord?.chronicConditions || "",
        currentMedications: patient.clinicalRecord?.currentMedications || ""
      });
    } catch (error) {
      console.error(error);
      setSelectedPatientDetail(null);
    } finally {
      setLoadingSelectedPatientDetail(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && (activeSection === "patients" || activeSection === "odontogram")) {
      fetchPatients();
    }
  }, [isLoggedIn, activeSection]);

  useEffect(() => {
    if (activeSection === "odontogram" && patients.length > 0 && !selectedOdontogramPatientId) {
      setSelectedOdontogramPatientId(String(patients[0].id));
    }
  }, [activeSection, patients, selectedOdontogramPatientId]);

  useEffect(() => {
    if (activeSection === "odontogram" && selectedOdontogramPatientId) {
      fetchOdontogram(selectedOdontogramPatientId);
    }
  }, [activeSection, selectedOdontogramPatientId]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetail(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    setDoctorsError("");
    try {
      const response = await fetch("http://localhost:3000/api/doctors?includeInactive=true");
      if (!response.ok) {
        throw new Error("No se pudo cargar la lista de doctores");
      }
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error(error);
      setDoctors([]);
      setDoctorsError("No se pudo cargar la lista de doctores. Verifica que el backend esté disponible.");
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeSection === "doctors") {
      fetchDoctors();
    }
  }, [isLoggedIn, activeSection]);

  const fetchAppointmentDoctors = async () => {
    setLoadingAppointmentDoctors(true);
    try {
      const response = await fetch("http://localhost:3000/api/doctors");
      if (!response.ok) throw new Error("No se pudo cargar la lista de doctores");
      const data = await response.json();
      setAppointmentDoctors(data);
    } catch (error) {
      console.error(error);
      setAppointmentDoctors([]);
    } finally {
      setLoadingAppointmentDoctors(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeSection === "appointments") {
      fetchAppointmentDoctors();
    }
  }, [isLoggedIn, activeSection]);

  const activeDoctors = useMemo(() => doctors.filter((doctor) => doctor.active), [doctors]);
  const inactiveDoctors = useMemo(() => doctors.filter((doctor) => !doctor.active), [doctors]);

  const openDoctorModal = () => {
    setDoctorModalMode("create");
    setEditingDoctorId(null);
    setDoctorForm(emptyDoctorForm);
    setDoctorFormError("");
    setIsDoctorModalOpen(true);
  };

  const openEditDoctorModal = (doctor) => {
    setDoctorModalMode("edit");
    setEditingDoctorId(doctor.id);
    setDoctorForm({
      name: doctor.name || "",
      specialty: doctor.specialty || "",
      email: doctor.email || "",
      phone: doctor.phone ? String(doctor.phone).replace(/\D/g, "").slice(0, 10) : ""
    });
    setDoctorFormError("");
    setIsDoctorModalOpen(true);
  };

  const closeDoctorModal = () => {
    setDoctorModalMode("create");
    setEditingDoctorId(null);
    setDoctorForm(emptyDoctorForm);
    setDoctorFormError("");
    setIsDoctorModalOpen(false);
  };

  const handleSaveDoctor = async (event) => {
    event.preventDefault();
    setDoctorFormError("");

    const trimmedName = doctorForm.name.trim();
    const trimmedSpecialty = doctorForm.specialty.trim();
    const cleanPhone = doctorForm.phone ? String(doctorForm.phone).replace(/\D/g, "").slice(0, 10) : "";

    if (!trimmedName || !trimmedSpecialty) {
      setDoctorFormError("El nombre y la especialidad son obligatorios.");
      return;
    }

    if (cleanPhone && cleanPhone.length !== 10) {
      setDoctorFormError("El teléfono debe contener exactamente 10 dígitos o dejarse vacío.");
      return;
    }

    setSavingDoctor(true);
    try {
      const isEditing = doctorModalMode === "edit" && editingDoctorId;
      const url = isEditing
        ? `http://localhost:3000/api/doctors/${editingDoctorId}`
        : "http://localhost:3000/api/doctors";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          specialty: trimmedSpecialty,
          email: doctorForm.email.trim() || undefined,
          phone: cleanPhone || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || (isEditing ? "Error al actualizar el doctor" : "Error al registrar el doctor"));
      }

      closeDoctorModal();
      setDoctorSuccessMessage(isEditing ? "Doctor actualizado con éxito." : "Doctor registrado con éxito.");
      setTimeout(() => setDoctorSuccessMessage(""), 4000);
      await fetchDoctors();
      await fetchAppointmentDoctors();
    } catch (error) {
      console.error(error);
      setDoctorFormError(error.message || "No se pudo guardar el doctor.");
    } finally {
      setSavingDoctor(false);
    }
  };

  const handleDeactivateDoctor = async (doctor) => {
    const confirmed = window.confirm(`¿Deseas desactivar al doctor ${doctor.name}?`);
    if (!confirmed) {
      return;
    }

    setDeactivatingDoctorId(doctor.id);
    try {
      const response = await fetch(`http://localhost:3000/api/doctors/${doctor.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "No se pudo desactivar el doctor");
      }

      setDoctorSuccessMessage(`Doctor ${doctor.name} desactivado.`);
      setTimeout(() => setDoctorSuccessMessage(""), 4000);
      await fetchDoctors();
      await fetchAppointmentDoctors();
    } catch (error) {
      console.error(error);
      alert(error.message || "Error al desactivar al doctor.");
    } finally {
      setDeactivatingDoctorId(null);
    }
  };

  const handleActivateDoctor = async (doctor) => {
    const confirmed = window.confirm(`¿Deseas reactivar al doctor ${doctor.name}?`);
    if (!confirmed) {
      return;
    }

    setActivatingDoctorId(doctor.id);
    try {
      const response = await fetch(`http://localhost:3000/api/doctors/${doctor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "No se pudo reactivar el doctor");
      }

      setDoctorSuccessMessage(`Doctor ${doctor.name} reactivado con éxito.`);
      setTimeout(() => setDoctorSuccessMessage(""), 4000);
      await fetchDoctors();
      await fetchAppointmentDoctors();
    } catch (error) {
      console.error(error);
      alert(error.message || "Error al reactivar al doctor.");
    } finally {
      setActivatingDoctorId(null);
    }
  };

  const fetchOdontogram = async (patientId) => {
    if (!patientId) {
      setOdontogram([]);
      return;
    }

    setLoadingOdontogram(true);
    setOdontogramError("");

    try {
      const response = await fetch(`http://localhost:3000/api/odontogram/patient/${patientId}`);
      if (!response.ok) {
        throw new Error("No se pudo cargar el odontograma del paciente");
      }

      const data = await response.json();
      setOdontogram(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setOdontogram([]);
      setOdontogramError(error.message || "No se pudo cargar el odontograma.");
    } finally {
      setLoadingOdontogram(false);
    }
  };

  const saveOdontogramTooth = async (toothId) => {
    if (!selectedOdontogramPatientId) {
      return;
    }

    const existing = odontogram.find((item) => item.toothId === String(toothId));
    const oneStepAfter = odontogramStatuses.indexOf(existing?.status || "SANO") + 1;
    const nextStatus = odontogramStatuses[oneStepAfter % odontogramStatuses.length];

    setSavingOdontogramTooth(true);
    setOdontogramError("");

    try {
      const response = await fetch(`http://localhost:3000/api/odontogram/patient/${selectedOdontogramPatientId}/tooth/${toothId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          notes: existing?.notes || ""
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo guardar el estado del diente");
      }

      const toothData = await response.json();
      setOdontogram((current) => {
        const existingIndex = current.findIndex((item) => item.toothId === String(toothId));
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = toothData;
          return next;
        }

        return [...current, toothData];
      });
    } catch (error) {
      console.error(error);
      setOdontogramError(error.message || "No se pudo guardar el diente.");
    } finally {
      setSavingOdontogramTooth(false);
    }
  };

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

  const selectedPatientAppointments = useMemo(() => {
    if (!selectedPatientDetail?.id) {
      return [];
    }

    return appointments
      .filter((appointment) => String(appointment.patientId) === String(selectedPatientDetail.id))
      .sort((first, second) => {
        const dateCompare = String(first.date || "").localeCompare(String(second.date || ""));
        if (dateCompare !== 0) {
          return dateCompare;
        }
        return String(first.time || "").localeCompare(String(second.time || ""));
      });
  }, [appointments, selectedPatientDetail]);

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

  const openAppointmentForm = async () => {
    setAppointmentFormMode("create");
    setEditingAppointmentId(null);
    setAppointmentForm(emptyAppointmentForm);
    setAppointmentFormError("");
    setIsAppointmentFormOpen(true);

    await fetchAppointmentDoctors();

    if (patients.length === 0) {
      await fetchPatients();
    }
  };

  const openAppointmentDetails = (appointment) => {
    setSelectedAppointmentId(appointment.id);
  };

  const openEditAppointmentForm = async (appointment) => {
    const patientList = patients.length > 0 ? patients : await fetchPatients();

    setAppointmentFormMode("edit");
    setEditingAppointmentId(appointment.id);
    setAppointmentForm({
      patientId: String(appointment.patientId || patientList.find((patient) => patient.fullName === appointment.patientName)?.id || ""),
      doctorId: String(appointment.doctorId || ""),
      cubicleId: String(appointment.cubicleId || ""),
      date: appointment.date?.slice(0, 10) || "",
      time: appointment.time?.slice(0, 5) || "",
      reason: appointment.reason || "",
      observations: appointment.observations || "",
      status: normalizeStatusForAppointment(
        appointment.status,
        appointment.date?.slice(0, 10),
        appointment.time
      )
    });
    setAppointmentFormError("");
    setIsAppointmentFormOpen(true);
  };

  const handleSaveAppointment = async (event) => {
    event.preventDefault();
    setSavingAppointment(true);
    setAppointmentFormError("");

    const today = getTodayDateKey();
    if (!appointmentForm.date || appointmentForm.date < today) {
      setAppointmentFormError("No se puede agendar una cita en una fecha pasada");
      setSavingAppointment(false);
      return;
    }

    if (appointmentForm.date === today && appointmentForm.time < getCurrentTimeKey()) {
      setAppointmentFormError("No se puede agendar una cita en un horario que ya pasó");
      setSavingAppointment(false);
      return;
    }

    const selectedPatient = patients.find((patient) => patient.id === Number(appointmentForm.patientId));
    const selectedDoctor = appointmentDoctors.find((doctor) => doctor.id === Number(appointmentForm.doctorId));
    const selectedCubicle = temporaryCubicles.find((cubicle) => cubicle.id === Number(appointmentForm.cubicleId));

    const payload = {
      patientId: selectedPatient?.id,
      patientName: selectedPatient?.fullName,
      doctorId: selectedDoctor?.id,
      doctor: selectedDoctor?.name,
      cubicleId: selectedCubicle?.id,
      room: selectedCubicle?.name,
      date: appointmentForm.date,
      time: appointmentForm.time,
      reason: appointmentForm.reason,
      observations: appointmentForm.observations,
      status: normalizeStatusForAppointment(appointmentForm.status, appointmentForm.date, appointmentForm.time)
    };

    const preventiveConflict = getAppointmentConflictMessage(
      appointments,
      appointmentForm,
      appointmentFormMode === "edit" ? editingAppointmentId : null
    );
    if (preventiveConflict) {
      setAppointmentFormError(preventiveConflict);
      setSavingAppointment(false);
      return;
    }

    try {
      const url = appointmentFormMode === "edit"
        ? `http://localhost:3000/api/appointments/${editingAppointmentId}`
        : "http://localhost:3000/api/appointments";
      const method = appointmentFormMode === "edit" ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const backendMessage = errorData.error || errorData.message;
        throw new Error(
          translateAppointmentSaveError(backendMessage || "No se pudo guardar la cita.")
        );
      }

      await fetchAppointments();
      setIsAppointmentFormOpen(false);
      setAppointmentFormMode("create");
      setEditingAppointmentId(null);
      setAppointmentForm(emptyAppointmentForm);
    } catch (error) {
      console.error(error);
      setAppointmentFormError(error.message || "No se pudo guardar la cita.");
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleCreateBudget = async (event) => {
    event.preventDefault();
    setSavingBudget(true);
    setBudgetFormError("");

    if (!budgetForm.patientId || budgetForm.treatments.length === 0) {
      setBudgetFormError("Debes seleccionar un paciente y al menos un tratamiento");
      setSavingBudget(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/billing/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: Number(budgetForm.patientId),
          treatments: budgetForm.treatments.map(Number)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo crear el presupuesto");
      }

      await fetchBudgets();
      setIsBudgetFormOpen(false);
      setBudgetForm({ patientId: "", treatments: [] });
    } catch (error) {
      console.error(error);
      setBudgetFormError(error.message || "No se pudo crear el presupuesto");
    } finally {
      setSavingBudget(false);
    }
  };

  const handleAddTreatment = async (event) => {
    event.preventDefault();
    setSavingAddTreatment(true);
    setAddTreatmentFormError("");

    const name = addTreatmentForm.name.trim();
    const price = Number(addTreatmentForm.price);

    if (!name) {
      setAddTreatmentFormError("El nombre es requerido");
      setSavingAddTreatment(false);
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      setAddTreatmentFormError("El precio es requerido y debe ser mayor a 0");
      setSavingAddTreatment(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/billing/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo crear el tratamiento");
      }

      await fetchTreatments();
      setIsAddTreatmentModalOpen(false);
      setAddTreatmentForm({ name: "", price: "" });
    } catch (error) {
      console.error(error);
      setAddTreatmentFormError(error.message || "No se pudo crear el tratamiento");
    } finally {
      setSavingAddTreatment(false);
    }
  };

  const handleDeleteTreatment = async () => {
    if (!treatmentToDelete) return;

    try {
      const response = await fetch(`http://localhost:3000/api/billing/treatments/${treatmentToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo eliminar el tratamiento");
      }

      await fetchTreatments();
      setTreatmentToDelete(null);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo eliminar el tratamiento");
    }
  };

  const handleCreatePayment = async (event) => {
    event.preventDefault();
    setSavingPayment(true);
    setPaymentFormError("");

    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setPaymentFormError("El monto debe ser mayor a 0");
      setSavingPayment(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/billing/budgets/${selectedBudgetId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentForm.amount)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo registrar el pago");
      }

      await fetchBudgets();
      setIsPaymentFormOpen(false);
      setPaymentForm({ amount: "" });
      setSelectedBudgetId(null);
    } catch (error) {
      console.error(error);
      setPaymentFormError(error.message || "No se pudo registrar el pago");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeleteAppointment = async (appointment) => {
    const confirmed = window.confirm(`¿Deseas eliminar la cita de ${appointment.patientName}?`);
    if (!confirmed) {
      return;
    }

    setDeletingAppointmentId(appointment.id);
    setAppointmentDeleteError("");

    try {
      const response = await fetch(`http://localhost:3000/api/appointments/${appointment.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo eliminar la cita");
      }

      setAppointments((currentAppointments) => currentAppointments.filter((item) => item.id !== appointment.id));
      if (selectedAppointmentId === appointment.id) {
        setSelectedAppointmentId(null);
      }
    } catch (error) {
      console.error(error);
      setAppointmentDeleteError(error.message || "No se pudo eliminar la cita. Intenta nuevamente.");
    } finally {
      setDeletingAppointmentId(null);
    }
  };

  const handleAppointmentStatusChange = async (appointment, status) => {
    if (updatingAppointmentId === appointment.id || appointment.status === status) {
      return;
    }

    if (!["LLEGO", "EN_ESPERA", "FALTO"].includes(status)) {
      setAppointmentStatusError("Estado de cita no permitido");
      return;
    }

    if (isFutureAppointment(appointment.date?.slice(0, 10)) && status !== "EN_ESPERA") {
      setAppointmentStatusError("El estado podrá actualizarse el día de la cita.");
      return;
    }

    if (isPastAppointment(appointment.date?.slice(0, 10), appointment.time) && status === "EN_ESPERA") {
      setAppointmentStatusError("Una cita vencida no puede permanecer En espera.");
      return;
    }

    if (isBeforeAppointmentTime(appointment.date?.slice(0, 10), appointment.time) && status === "FALTO") {
      setAppointmentStatusError("No se puede marcar Faltó antes de la hora de la cita.");
      return;
    }

    setUpdatingAppointmentId(appointment.id);
    setAppointmentStatusError("");

    try {
      const response = await fetch(`http://localhost:3000/api/appointments/${appointment.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo actualizar el estado de la cita");
      }

      const updatedAppointment = await response.json();
      setAppointments((currentAppointments) => currentAppointments.map((item) => (
        item.id === appointment.id ? { ...item, status: normalizeAppointmentStatus(updatedAppointment.status) } : item
      )));
    } catch (error) {
      console.error(error);
      setAppointmentStatusError(error.message || "No se pudo actualizar el estado. Intenta nuevamente.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const openClinicalRecordForm = () => {
    if (!selectedPatientDetail) {
      return;
    }

    setClinicalRecordForm({
      reasonForVisit: selectedPatientDetail.clinicalRecord?.reasonForVisit || "",
      diagnosis: selectedPatientDetail.clinicalRecord?.diagnosis || "",
      observations: selectedPatientDetail.clinicalRecord?.observations || "",
      allergies: selectedPatientDetail.clinicalRecord?.allergies || "",
      chronicConditions: selectedPatientDetail.clinicalRecord?.chronicConditions || "",
      currentMedications: selectedPatientDetail.clinicalRecord?.currentMedications || ""
    });
    setIsClinicalRecordFormOpen(true);
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

  const handleSaveClinicalRecord = async (event) => {
    event.preventDefault();

    if (!selectedPatientDetail?.id) {
      return;
    }

    setSavingClinicalRecord(true);

    try {
      const response = await fetch(`http://localhost:3000/api/patients/${selectedPatientDetail.id}/clinical-record`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clinicalRecordForm)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo guardar el expediente clínico");
      }

      const updatedClinicalRecord = await response.json();
      setSelectedPatientDetail({
        ...selectedPatientDetail,
        clinicalRecord: updatedClinicalRecord
      });
      setIsClinicalRecordFormOpen(false);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar el expediente clínico");
    } finally {
      setSavingClinicalRecord(false);
    }
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
          <button type="button" className="primary-button" onClick={openAppointmentForm}>Nueva cita</button>
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
                        className={selectedPatientDetail?.id === patient.id ? "patient-row active" : "patient-row"}
                        onClick={async () => {
                          setSelectedPatientId(patient.id);
                          await fetchPatientDetail(patient.id);
                        }}
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
                {loadingSelectedPatientDetail ? (
                  <p>Cargando expediente...</p>
                ) : selectedPatientDetail ? (
                  <>
                    <div className="profile-header">
                      <div>
                        <p className="badge">Paciente</p>
                        <h3>{selectedPatientDetail.fullName}</h3>
                      </div>
                      <div className="profile-actions">
                        <button type="button" className="secondary-button" onClick={() => openEditForm(selectedPatientDetail)}>
                          Editar paciente
                        </button>
                        <button type="button" className="primary-button" onClick={openClinicalRecordForm}>
                          Editar expediente
                        </button>
                      </div>
                    </div>

                    <div className="profile-grid">
                      <div>
                        <span>Teléfono</span>
                        <strong>{selectedPatientDetail.phone}</strong>
                      </div>
                      <div>
                        <span>Correo</span>
                        <strong>{selectedPatientDetail.email || "No registrado"}</strong>
                      </div>
                      <div>
                        <span>Fecha de nacimiento</span>
                        <strong>{formatBirthDate(selectedPatientDetail.birthDate)}</strong>
                      </div>
                      <div>
                        <span>Dirección</span>
                        <strong>{selectedPatientDetail.address || "No registrada"}</strong>
                      </div>
                    </div>

                    <div className="profile-alerts">
                      <h4>Alertas médicas</h4>
                      <ul>
                        {selectedPatientDetail.medicalAlerts?.length ? (
                          selectedPatientDetail.medicalAlerts.map((alert) => <li key={alert}>{alert}</li>)
                        ) : (
                          <li>Sin alertas</li>
                        )}
                      </ul>
                    </div>

                    <div className="patient-appointments-card">
                      <div className="clinical-card-title">
                        <h4>Citas del paciente</h4>
                        <span className="appointment-count">{selectedPatientAppointments.length}</span>
                      </div>

                      {selectedPatientAppointments.length === 0 ? (
                        <p className="muted">Sin citas registradas.</p>
                      ) : (
                        <div className="appointments-history-list">
                          {selectedPatientAppointments.map((appointment) => (
                            <div className="history-appointment-row" key={appointment.id}>
                              <div className="history-appointment-top">
                                <span className="history-date">{formatAppointmentDate(appointment.date?.slice(0, 10))}</span>
                                <span className="history-time">{formatAppointmentTimeOption(formatAppointmentTime(appointment.time))}</span>
                                <span className={`history-status history-${appointment.status?.toLowerCase()}`}>{formatAppointmentStatus(appointment.status)}</span>
                              </div>
                              <div className="history-appointment-meta">
                                <span><strong>Doctor:</strong> {appointment.doctor || "Sin doctor"}</span>
                                <span><strong>Cubículo:</strong> {appointment.room || "Sin cubículo"}</span>
                              </div>
                              <div className="history-appointment-reason">
                                <span><strong>Motivo:</strong> {appointment.reason || "Sin motivo registrado"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="clinical-card">
                      <div className="clinical-card-title">
                        <h4>Expediente clínico</h4>
                      </div>

                      <div className="clinical-grid">
                        <div>
                          <span>Motivo de visita</span>
                          <strong>{selectedPatientDetail.clinicalRecord?.reasonForVisit || "No registrado"}</strong>
                        </div>
                        <div>
                          <span>Diagnóstico</span>
                          <strong>{selectedPatientDetail.clinicalRecord?.diagnosis || "No registrado"}</strong>
                        </div>
                        <div>
                          <span>Observaciones</span>
                          <strong>{selectedPatientDetail.clinicalRecord?.observations || "No registradas"}</strong>
                        </div>
                        <div>
                          <span>Alergias</span>
                          <strong>{selectedPatientDetail.clinicalRecord?.allergies || "No registradas"}</strong>
                        </div>
                        <div>
                          <span>Condiciones crónicas</span>
                          <strong>{selectedPatientDetail.clinicalRecord?.chronicConditions || "No registradas"}</strong>
                        </div>
                        <div>
                          <span>Medicación actual</span>
                          <strong>{selectedPatientDetail.clinicalRecord?.currentMedications || "No registrada"}</strong>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>Selecciona un paciente para ver su perfil.</p>
                )}
              </div>
            </div>

            {isClinicalRecordFormOpen && (
              <div className="modal-backdrop">
                <div className="modal-card clinical-modal">
                  <div className="section-heading">
                    <h3>Expediente clínico</h3>
                    <button type="button" className="close-button" onClick={() => setIsClinicalRecordFormOpen(false)}>Cerrar</button>
                  </div>

                  <form className="patient-form clinical-form" onSubmit={handleSaveClinicalRecord}>
                    <label>
                      Motivo de visita
                      <textarea
                        value={clinicalRecordForm.reasonForVisit}
                        onChange={(event) => setClinicalRecordForm({ ...clinicalRecordForm, reasonForVisit: event.target.value })}
                      />
                    </label>
                    <label>
                      Diagnóstico
                      <textarea
                        value={clinicalRecordForm.diagnosis}
                        onChange={(event) => setClinicalRecordForm({ ...clinicalRecordForm, diagnosis: event.target.value })}
                      />
                    </label>
                    <label>
                      Observaciones
                      <textarea
                        value={clinicalRecordForm.observations}
                        onChange={(event) => setClinicalRecordForm({ ...clinicalRecordForm, observations: event.target.value })}
                      />
                    </label>
                    <label>
                      Alergias
                      <textarea
                        value={clinicalRecordForm.allergies}
                        onChange={(event) => setClinicalRecordForm({ ...clinicalRecordForm, allergies: event.target.value })}
                      />
                    </label>
                    <label>
                      Condiciones crónicas
                      <textarea
                        value={clinicalRecordForm.chronicConditions}
                        onChange={(event) => setClinicalRecordForm({ ...clinicalRecordForm, chronicConditions: event.target.value })}
                      />
                    </label>
                    <label>
                      Medicación actual
                      <textarea
                        value={clinicalRecordForm.currentMedications}
                        onChange={(event) => setClinicalRecordForm({ ...clinicalRecordForm, currentMedications: event.target.value })}
                      />
                    </label>

                    <div className="form-actions">
                      <button type="button" className="secondary-button" onClick={() => setIsClinicalRecordFormOpen(false)}>Cancelar</button>
                      <button type="submit" className="primary-button" disabled={savingClinicalRecord}>
                        {savingClinicalRecord ? "Guardando..." : "Guardar expediente"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

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
              <div>
                <h2>{appointmentView === "daily" ? "Agenda diaria" : "Agenda semanal"}</h2>
                <label className="appointment-date-filter">
                  Fecha de referencia:
                  <input
                    type="date"
                    value={selectedAppointmentDate}
                    onChange={(event) => setSelectedAppointmentDate(event.target.value)}
                    aria-label="Fecha de Agenda"
                    lang="en-US"
                  />
                </label>
              </div>
              <div className="appointment-view-switcher" aria-label="Vista de Agenda">
                <button
                  type="button"
                  className={appointmentView === "daily" ? "appointment-view-button active" : "appointment-view-button"}
                  onClick={() => setAppointmentView("daily")}
                >
                  Vista diaria
                </button>
                <button
                  type="button"
                  className={appointmentView === "weekly" ? "appointment-view-button active" : "appointment-view-button"}
                  onClick={() => setAppointmentView("weekly")}
                >
                  Vista semanal
                </button>
              </div>
              <div className="legend">
                <span className="dot arrived"></span>Llego
                <span className="dot waiting"></span>Espera
                <span className="dot missed"></span>Falto
              </div>
            </div>
            {appointmentDeleteError ? <p className="appointment-delete-error">{appointmentDeleteError}</p> : null}
            {appointmentStatusError ? <p className="appointment-status-error">{appointmentStatusError}</p> : null}
            {loadingAppointments ? <p>Cargando citas...</p> : null}
            {appointmentsError ? <p>{appointmentsError}</p> : null}
            {!loadingAppointments && !appointmentsError && appointmentView === "daily" && (
              <div className="appointments">
                {filteredAppointments.length === 0 ? (
                  <p>No hay citas programadas para este día.</p>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onView={openAppointmentDetails}
                    />
                  ))
                )}
              </div>
            )}
            {!loadingAppointments && !appointmentsError && appointmentView === "weekly" && (
              <div className="appointment-week-grid">
                {weeklyAppointments.map((day) => (
                  <section className="appointment-week-day" key={day.date}>
                    <div className="appointment-week-day-header">
                      <strong>{day.label}</strong>
                      <span>{formatAppointmentDate(day.date)}</span>
                    </div>
                    {day.appointments.length === 0 ? (
                      <p className="appointment-empty-day">Sin citas</p>
                    ) : (
                      <div className="appointment-week-list">
                        {day.appointments.map((appointment) => (
                          <AppointmentCard
                            key={appointment.id}
                            appointment={appointment}
                            showDate={false}
                            onView={openAppointmentDetails}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
            {selectedAppointment && (
              <AppointmentDetailModal
                appointment={selectedAppointment}
                onClose={() => setSelectedAppointmentId(null)}
                onEdit={async () => {
                  setSelectedAppointmentId(null);
                  await openEditAppointmentForm(selectedAppointment);
                }}
                onDelete={() => handleDeleteAppointment(selectedAppointment)}
                onStatusChange={handleAppointmentStatusChange}
                deletingAppointmentId={deletingAppointmentId}
                updatingAppointmentId={updatingAppointmentId}
              />
            )}
          </section>
        )}

        {activeSection === "doctors" && (
          <section className="panel doctors-panel">
            <div className="section-heading">
              <div>
                <h2>Gestión de Doctores</h2>
                <p className="section-subtitle">Especialistas disponibles en la clínica</p>
              </div>
              <button type="button" className="primary-button" onClick={openDoctorModal}>
                + Nuevo doctor
              </button>
            </div>

            {doctorSuccessMessage && (
              <div className="doctors-success-banner">
                <p>{doctorSuccessMessage}</p>
                <button type="button" className="close-button" onClick={() => setDoctorSuccessMessage("")}>✕</button>
              </div>
            )}

            {loadingDoctors && (
              <div className="doctors-state-box">
                <p>Cargando doctores...</p>
              </div>
            )}

            {!loadingDoctors && doctorsError && (
              <div className="doctors-error-banner">
                <p>{doctorsError}</p>
                <button type="button" className="secondary-button" onClick={fetchDoctors}>
                  Reintentar
                </button>
              </div>
            )}

            {!loadingDoctors && !doctorsError && doctors.length === 0 && (
              <div className="doctors-empty-box">
                <p>No hay doctores registrados en el sistema.</p>
              </div>
            )}

            {!loadingDoctors && !doctorsError && doctors.length > 0 && activeDoctors.length === 0 && (
              <div className="doctors-empty-box">
                <p>No hay doctores activos registrados en el sistema.</p>
              </div>
            )}

            {!loadingDoctors && !doctorsError && activeDoctors.length > 0 && (
              <div className="doctors-table-card">
                <div className="table doctors-table">
                  <div className="table-row table-head doctors-table-row">
                    <span>Nombre</span>
                    <span>Especialidad</span>
                    <span>Correo</span>
                    <span>Teléfono</span>
                    <span>Acciones</span>
                  </div>
                  {activeDoctors.map((doctor) => (
                    <div key={doctor.id} className="table-row doctors-table-row">
                      <span className="doctor-name-cell">
                        <strong>{doctor.name}</strong>
                      </span>
                      <span>
                        <span className="doctor-specialty-tag">{doctor.specialty || "General"}</span>
                      </span>
                      <span className="doctor-meta-cell">{doctor.email || "No registrado"}</span>
                      <span className="doctor-meta-cell">{formatDoctorTablePhone(doctor.phone)}</span>
                      <div className="doctor-actions">
                        <button
                          type="button"
                          className="doctor-edit-button"
                          onClick={() => openEditDoctorModal(doctor)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="doctor-deactivate-button"
                          onClick={() => handleDeactivateDoctor(doctor)}
                          disabled={deactivatingDoctorId === doctor.id}
                        >
                          {deactivatingDoctorId === doctor.id ? "Desactivando..." : "Desactivar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingDoctors && !doctorsError && inactiveDoctors.length > 0 && (
              <div className="inactive-doctors-section">
                <div className="section-heading">
                  <div>
                    <h3>Doctores desactivados</h3>
                    <p className="section-subtitle">Especialistas dados de baja lógica que no están disponibles para citas</p>
                  </div>
                </div>

                <div className="doctors-table-card inactive-card">
                  <div className="table doctors-table">
                    <div className="table-row table-head doctors-table-row">
                      <span>Nombre</span>
                      <span>Especialidad</span>
                      <span>Correo</span>
                      <span>Teléfono</span>
                      <span>Acciones</span>
                    </div>
                    {inactiveDoctors.map((doctor) => (
                      <div key={doctor.id} className="table-row doctors-table-row inactive-doctor-row">
                        <span className="doctor-name-cell inactive-text">
                          <strong>{doctor.name}</strong>
                        </span>
                        <span>
                          <span className="doctor-specialty-tag inactive">{doctor.specialty || "General"}</span>
                        </span>
                        <span className="doctor-meta-cell inactive-text">{doctor.email || "No registrado"}</span>
                        <span className="doctor-meta-cell inactive-text">{formatDoctorTablePhone(doctor.phone)}</span>
                        <div className="doctor-actions">
                          <button
                            type="button"
                            className="doctor-edit-button"
                            onClick={() => openEditDoctorModal(doctor)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="doctor-activate-button"
                            onClick={() => handleActivateDoctor(doctor)}
                            disabled={activatingDoctorId === doctor.id}
                          >
                            {activatingDoctorId === doctor.id ? "Activando..." : "Activar"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isDoctorModalOpen && (
              <div className="modal-backdrop">
                <div className="modal-card">
                  <div className="section-heading">
                    <h3>{doctorModalMode === "create" ? "Nuevo doctor" : "Editar doctor"}</h3>
                    <button type="button" className="close-button" onClick={closeDoctorModal}>Cerrar</button>
                  </div>

                  <form className="doctor-form" onSubmit={handleSaveDoctor}>
                    {doctorFormError && (
                      <p className="doctor-form-error">{doctorFormError}</p>
                    )}

                    <label>
                      Nombre *
                      <input
                        value={doctorForm.name}
                        onChange={(event) => setDoctorForm({ ...doctorForm, name: event.target.value })}
                        placeholder="Ej. Dra. Rivera"
                        required
                      />
                    </label>

                    <label>
                      Especialidad *
                      <input
                        value={doctorForm.specialty}
                        onChange={(event) => setDoctorForm({ ...doctorForm, specialty: event.target.value })}
                        placeholder="Ej. Ortodoncia"
                        required
                      />
                    </label>

                    <label>
                      Correo
                      <input
                        type="email"
                        value={doctorForm.email}
                        onChange={(event) => setDoctorForm({ ...doctorForm, email: event.target.value })}
                        placeholder="doctor@clinica.test"
                      />
                    </label>

                    <label>
                      Teléfono
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={formatDoctorPhoneInput(doctorForm.phone)}
                        onChange={(event) => {
                          const onlyDigits = event.target.value.replace(/\D/g, "").slice(0, 10);
                          setDoctorForm({ ...doctorForm, phone: onlyDigits });
                        }}
                        placeholder="000-0000-000"
                      />
                    </label>

                    <div className="form-actions">
                      <button type="button" className="secondary-button" onClick={closeDoctorModal} disabled={savingDoctor}>
                        Cancelar
                      </button>
                      <button type="submit" className="primary-button" disabled={savingDoctor}>
                        {savingDoctor ? "Guardando..." : (doctorModalMode === "create" ? "Guardar doctor" : "Guardar cambios")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "odontogram" && (
          <section id="odontogram" className="panel">
            <div className="section-heading">
              <h2>Odontograma</h2>
              <select
                aria-label="Paciente del odontograma"
                value={selectedOdontogramPatientId}
                onChange={(event) => setSelectedOdontogramPatientId(event.target.value)}
                disabled={loadingPatients}
              >
                <option value="">Selecciona un paciente</option>
                {patients.map((patient) => (
                  <option value={patient.id} key={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            </div>

            {odontogramError && <p className="odontogram-error">{odontogramError}</p>}

            {loadingOdontogram ? (
              <p>Cargando odontograma...</p>
            ) : (
              <div className="odontogram-board">
                <div className="odontogram-legend">
                  <span><i className="legend-dot legend-sano" />Sano</span>
                  <span><i className="legend-dot legend-caries" />Caries</span>
                  <span><i className="legend-dot legend-endodoncia" />Endodoncia</span>
                  <span><i className="legend-dot legend-extraccion" />Extracción</span>
                </div>

                <div className="odontogram-arches">
                  <div className="odontogram-zone">
                    <div className="odontogram-zone-title">
                      <span>Arcada superior</span>
                    </div>
                    <div className="odontogram-grid upper-grid">
                      {teeth.slice(0, 16).map((tooth) => {
                        const toothRecord = odontogram.find((item) => item.toothId === String(tooth.id));
                        const status = toothRecord?.status || "SANO";
                        return (
                          <button
                            className={`tooth ${String(status).toLowerCase()}`}
                            type="button"
                            key={tooth.id}
                            disabled={savingOdontogramTooth || !selectedOdontogramPatientId}
                            title={`${tooth.name}: ${status}`}
                            onClick={() => saveOdontogramTooth(tooth.id)}
                          >
                            <span className="tooth-name">{tooth.name}</span>
                            <span className="tooth-status">{status}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="odontogram-zone">
                    <div className="odontogram-zone-title">
                      <span>Arcada inferior</span>
                    </div>
                    <div className="odontogram-grid lower-grid">
                      {teeth.slice(16, 32).map((tooth) => {
                        const toothRecord = odontogram.find((item) => item.toothId === String(tooth.id));
                        const status = toothRecord?.status || "SANO";
                        return (
                          <button
                            className={`tooth ${String(status).toLowerCase()}`}
                            type="button"
                            key={tooth.id}
                            disabled={savingOdontogramTooth || !selectedOdontogramPatientId}
                            title={`${tooth.name}: ${status}`}
                            onClick={() => saveOdontogramTooth(tooth.id)}
                          >
                            <span className="tooth-name">{tooth.name}</span>
                            <span className="tooth-status">{status}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "billing" && (
          <section id="billing" className="panel">
            <div className="section-heading">
              <h2>Presupuesto y pagos</h2>
              <button type="button" className="primary-button" onClick={() => {
                fetchPatients();
                fetchTreatments();
                setIsBudgetFormOpen(true);
              }}>
                Generar presupuesto
              </button>
            </div>

            {budgetsError && <p className="error-message">{budgetsError}</p>}

            {loadingBudgets ? (
              <p>Cargando presupuestos...</p>
            ) : budgets.length === 0 ? (
              <p>No hay presupuestos registrados</p>
            ) : (
              <div className="budgets-list">
                {budgets.map((budget) => {
                  const patientName = patients.find((p) => p.id === budget.patientId)?.fullName || `Paciente #${budget.patientId}`;
                  const canPayment = budget.balance > 0 && budget.status !== "PAGADO";

                  return (
                    <div key={budget.id} className="budget-card">
                      <div className="budget-header">
                        <h3>{patientName}</h3>
                        <span className={`budget-status status-${budget.status.toLowerCase()}`}>
                          {budget.status}
                        </span>
                      </div>

                      <div className="budget-details">
                        <div className="detail-row">
                          <span>Tratamientos:</span>
                          <span>
                            {budget.treatments.map((t) => t.name).join(", ")}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Total:</span>
                          <strong>${budget.total.toLocaleString("es-MX")}</strong>
                        </div>
                        <div className="detail-row">
                          <span>Pagado:</span>
                          <strong>${budget.paid.toLocaleString("es-MX")}</strong>
                        </div>
                        <div className="detail-row">
                          <span>Saldo:</span>
                          <strong className={budget.balance > 0 ? "balance-pending" : "balance-paid"}>
                            ${budget.balance.toLocaleString("es-MX")}
                          </strong>
                        </div>
                      </div>

                      {canPayment && (
                        <div className="budget-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setSelectedBudgetId(budget.id);
                              setPaymentForm({ amount: "" });
                              setPaymentFormError("");
                              setIsPaymentFormOpen(true);
                            }}
                          >
                            Registrar pago
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {isBudgetFormOpen && (
          <div className="modal-backdrop">
            <div className="modal-card budget-modal">
              <div className="section-heading">
                <h3>Generar presupuesto</h3>
                <button type="button" className="close-button" onClick={() => setIsBudgetFormOpen(false)}>
                  Cerrar
                </button>
              </div>

              <form className="budget-form" onSubmit={handleCreateBudget}>
                <label>
                  Paciente
                  <select
                    value={budgetForm.patientId}
                    onChange={(event) => setBudgetForm({ ...budgetForm, patientId: event.target.value })}
                    required
                  >
                    <option value="">Selecciona un paciente</option>
                    {patients.map((patient) => (
                      <option value={patient.id} key={patient.id}>{patient.fullName}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Tratamientos (selecciona uno o varios)
                  <div className="treatment-actions">
                    <button 
                      type="button" 
                      className="secondary-button" 
                      onClick={() => setIsAddTreatmentModalOpen(true)}
                    >
                      + Agregar tratamiento
                    </button>
                    <button 
                      type="button" 
                      className="secondary-button" 
                      onClick={() => setIsManageTreatmentsModalOpen(true)}
                    >
                      Administrar tratamientos
                    </button>
                  </div>
                  <div className="treatments-checkbox-group">
                    {treatments.map((treatment) => (
                      <label key={treatment.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={budgetForm.treatments.includes(String(treatment.id))}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setBudgetForm({
                                ...budgetForm,
                                treatments: [...budgetForm.treatments, String(treatment.id)]
                              });
                            } else {
                              setBudgetForm({
                                ...budgetForm,
                                treatments: budgetForm.treatments.filter((id) => id !== String(treatment.id))
                              });
                            }
                          }}
                        />
                        {treatment.name} - ${treatment.price.toLocaleString("es-MX")}
                      </label>
                    ))}
                  </div>
                </label>

                <div className="budget-total-preview">
                  <span>Total:</span>
                  <strong>
                    ${budgetForm.treatments.reduce((sum, treatmentId) => {
                      const treatment = treatments.find((t) => String(t.id) === treatmentId);
                      return sum + (treatment?.price || 0);
                    }, 0).toLocaleString("es-MX")}
                  </strong>
                </div>

                {budgetFormError && <p className="form-error">{budgetFormError}</p>}

                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={() => setIsBudgetFormOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="primary-button" disabled={savingBudget}>
                    {savingBudget ? "Guardando..." : "Crear presupuesto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isAddTreatmentModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card add-treatment-modal">
              <div className="section-heading">
                <h3>Agregar tratamiento</h3>
                <button type="button" className="close-button" onClick={() => setIsAddTreatmentModalOpen(false)}>
                  Cerrar
                </button>
              </div>

              <form className="add-treatment-form" onSubmit={handleAddTreatment}>
                <label>
                  Nombre
                  <input
                    type="text"
                    value={addTreatmentForm.name}
                    onChange={(event) => setAddTreatmentForm({ ...addTreatmentForm, name: event.target.value })}
                    placeholder="Ej: Blanqueamiento"
                    required
                  />
                </label>

                <label>
                  Precio
                  <input
                    type="number"
                    className="no-spinner"
                    value={addTreatmentForm.price}
                    onChange={(event) => setAddTreatmentForm({ ...addTreatmentForm, price: event.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </label>

                {addTreatmentFormError && <p className="form-error">{addTreatmentFormError}</p>}

                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={() => setIsAddTreatmentModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="primary-button" disabled={savingAddTreatment}>
                    {savingAddTreatment ? "Guardando..." : "Agregar tratamiento"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isManageTreatmentsModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card manage-treatments-modal">
              <div className="section-heading">
                <h3>Administrar tratamientos</h3>
                <button type="button" className="close-button" onClick={() => {
                  setIsManageTreatmentsModalOpen(false);
                  setTreatmentToDelete(null);
                }}>
                  Cerrar
                </button>
              </div>

              <div className="treatments-management-list">
                {treatments.length === 0 ? (
                  <p className="empty-message">No hay tratamientos registrados</p>
                ) : (
                  treatments.map((treatment) => (
                    <div key={treatment.id} className="treatment-item">
                      <div className="treatment-info">
                        <div className="treatment-name">{treatment.name}</div>
                        <div className="treatment-price">${treatment.price.toLocaleString("es-MX")}</div>
                      </div>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => setTreatmentToDelete(treatment.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))
                )}
              </div>

              {treatmentToDelete && (
                <div className="delete-confirmation">
                  <p>¿Estás seguro de que deseas eliminar este tratamiento?</p>
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="secondary-button"
                      onClick={() => setTreatmentToDelete(null)}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      className="danger-button"
                      onClick={handleDeleteTreatment}
                    >
                      Confirmar eliminación
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isPaymentFormOpen && (
          <div className="modal-backdrop">
            <div className="modal-card payment-modal">
              <div className="section-heading">
                <h3>Registrar pago</h3>
                <button type="button" className="close-button" onClick={() => setIsPaymentFormOpen(false)}>
                  Cerrar
                </button>
              </div>

              {selectedBudgetId && (
                <>
                  {(() => {
                    const budget = budgets.find((b) => b.id === selectedBudgetId);
                    return budget ? (
                      <div className="payment-info">
                        <div className="info-row">
                          <span>Saldo pendiente:</span>
                          <strong>${budget.balance.toLocaleString("es-MX")}</strong>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <form className="payment-form" onSubmit={handleCreatePayment}>
                    <label>
                      Monto a pagar
                      <input
                        type="number"
                        className="no-spinner"
                        step="0.01"
                        min="0"
                        value={paymentForm.amount}
                        onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                        required
                        placeholder="0.00"
                      />
                    </label>

                    {paymentFormError && <p className="form-error">{paymentFormError}</p>}

                    <div className="form-actions">
                      <button type="button" className="secondary-button" onClick={() => setIsPaymentFormOpen(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="primary-button" disabled={savingPayment}>
                        {savingPayment ? "Guardando..." : "Registrar pago"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {isAppointmentFormOpen && (
          <div className="modal-backdrop">
            <div className="modal-card appointment-modal">
              <div className="section-heading">
                <h3>{appointmentFormMode === "edit" ? "Editar cita" : "Nueva cita"}</h3>
                <button type="button" className="close-button" onClick={() => setIsAppointmentFormOpen(false)}>
                  Cerrar
                </button>
              </div>

              <form className="appointment-form" onSubmit={handleSaveAppointment}>
                <label>
                  Paciente
                  <select
                    value={appointmentForm.patientId}
                    onChange={(event) => setAppointmentForm({ ...appointmentForm, patientId: event.target.value })}
                    required
                    disabled={loadingPatients}
                  >
                    <option value="">Selecciona un paciente</option>
                    {patients.map((patient) => (
                      <option value={patient.id} key={patient.id}>{patient.fullName}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Doctor
                  <select
                    value={appointmentForm.doctorId}
                    onChange={(event) => setAppointmentForm({ ...appointmentForm, doctorId: event.target.value })}
                    required
                    disabled={loadingAppointmentDoctors}
                  >
                    <option value="">{loadingAppointmentDoctors ? "Cargando doctores..." : "Selecciona un doctor"}</option>
                    {appointmentDoctors.map((doctor) => (
                      <option value={doctor.id} key={doctor.id}>{doctor.name}</option>
                    ))}
                    {appointmentFormMode === "edit" &&
                      appointmentForm.doctorId &&
                      !appointmentDoctors.some((d) => String(d.id) === String(appointmentForm.doctorId)) && (
                      <option value={appointmentForm.doctorId} disabled>
                        {appointments.find((a) => a.id === editingAppointmentId)?.doctor || `Doctor #${appointmentForm.doctorId}`} (inactivo)
                      </option>
                    )}
                  </select>
                </label>

                <label>
                  Cubiculo
                  <select
                    value={appointmentForm.cubicleId}
                    onChange={(event) => setAppointmentForm({ ...appointmentForm, cubicleId: event.target.value })}
                    required
                  >
                    <option value="">Selecciona un cubiculo</option>
                    {temporaryCubicles.map((cubicle) => (
                      <option value={cubicle.id} key={cubicle.id}>{cubicle.id} - {cubicle.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Fecha
                  <input
                    type="date"
                    value={appointmentForm.date}
                    min={getTodayDateKey()}
                    onChange={(event) => setAppointmentForm({
                      ...appointmentForm,
                      date: event.target.value,
                      status: normalizeStatusForAppointment(appointmentForm.status, event.target.value, appointmentForm.time)
                    })}
                    required
                    lang="en-US"
                  />
                </label>

                <label>
                  Hora
                  <select
                    value={appointmentForm.time}
                    onChange={(event) => setAppointmentForm({
                      ...appointmentForm,
                      time: event.target.value,
                      status: normalizeStatusForAppointment(appointmentForm.status, appointmentForm.date, event.target.value)
                    })}
                    required
                  >
                    <option value="">Selecciona un horario</option>
                    {appointmentForm.time && !availableAppointmentTimes.includes(appointmentForm.time) ? (
                      <option value={appointmentForm.time} disabled>
                        {formatAppointmentTimeOption(appointmentForm.time)} (selecciona un horario válido)
                      </option>
                    ) : null}
                    {availableAppointmentTimes.map((time) => (
                      <option value={time} key={time}>{formatAppointmentTimeOption(time)}</option>
                    ))}
                  </select>
                  {appointmentForm.date === getTodayDateKey() && availableAppointmentTimes.length === 0 ? (
                    <small>No quedan horarios disponibles para hoy.</small>
                  ) : null}
                </label>

                <label>
                  Motivo
                  <input
                    value={appointmentForm.reason}
                    onChange={(event) => setAppointmentForm({ ...appointmentForm, reason: event.target.value })}
                  />
                </label>

                <label className="appointment-form-wide">
                  Observaciones
                  <textarea
                    value={appointmentForm.observations}
                    onChange={(event) => setAppointmentForm({ ...appointmentForm, observations: event.target.value })}
                    rows="3"
                  />
                </label>

                {appointmentFormMode === "edit" ? (
                  <label>
                    Estado
                    <select
                      value={appointmentForm.status}
                      onChange={(event) => setAppointmentForm({ ...appointmentForm, status: event.target.value })}
                    >
                      {appointmentStatuses
                        .filter((status) => getAllowedAppointmentStatuses(appointmentForm.date, appointmentForm.time).includes(status))
                        .map((status) => (
                          <option value={status} key={status}>{formatAppointmentStatus(status)}</option>
                        ))}
                    </select>
                  </label>
                ) : null}

                {appointmentFormError ? <p className="appointment-form-error">{appointmentFormError}</p> : null}

                <div className="form-actions appointment-form-actions">
                  <button type="button" className="secondary-button" onClick={() => setIsAppointmentFormOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="primary-button" disabled={savingAppointment || loadingPatients}>
                    {savingAppointment ? "Guardando..." : appointmentFormMode === "edit" ? "Guardar cambios" : "Guardar cita"}
                  </button>
                </div>
              </form>
            </div>
          </div>
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

function AppointmentDetailModal({
  appointment,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  deletingAppointmentId,
  updatingAppointmentId
}) {
  const isBusy = deletingAppointmentId === appointment.id || updatingAppointmentId === appointment.id;
  const isFuture = isFutureAppointment(appointment.date?.slice(0, 10));
  const isBeforeScheduledTime = isBeforeAppointmentTime(appointment.date?.slice(0, 10), appointment.time);
  const isPast = isPastAppointment(appointment.date?.slice(0, 10), appointment.time);

  return (
    <div className="modal-backdrop">
      <div className="modal-card appointment-detail-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-detail-title">
        <div className="section-heading">
          <h3 id="appointment-detail-title">Ver cita</h3>
          <button type="button" className="close-button" onClick={onClose}>Cerrar</button>
        </div>

        <div className="appointment-detail-grid">
          <div>
            <span>Paciente</span>
            <strong>{appointment.patientName}</strong>
          </div>
          <div>
            <span>Doctor</span>
            <strong>{appointment.doctor}</strong>
          </div>
          <div>
            <span>Cubículo</span>
            <strong>{appointment.room}</strong>
          </div>
          <div>
            <span>Fecha</span>
            <strong>{formatAppointmentDate(appointment.date)}</strong>
          </div>
          <div>
            <span>Hora</span>
            <strong>{formatAppointmentTime(appointment.time)}</strong>
          </div>
          <div>
            <span>Estado</span>
            <strong className={`appointment-status-badge ${statusClass(appointment.status)}`}>
              {formatAppointmentStatus(appointment.status)}
            </strong>
          </div>
          <div className="appointment-detail-wide">
            <span>Motivo</span>
            <strong>{appointment.reason || "Sin registrar"}</strong>
          </div>
          <div className="appointment-detail-wide">
            <span>Observaciones</span>
            <strong>{appointment.observations || "Sin registrar"}</strong>
          </div>
        </div>

        <div className="appointment-detail-status-actions" aria-label={`Cambiar estado de cita de ${appointment.patientName}`}>
          {["LLEGO", "EN_ESPERA", "FALTO"].map((status) => (
            <button
              type="button"
              key={status}
              className={`appointment-status-button ${statusClass(status)}${appointment.status === status ? " active" : ""}`}
              onClick={() => onStatusChange(appointment, status)}
              disabled={isBusy || (isFuture && status !== "EN_ESPERA") || (isBeforeScheduledTime && status === "FALTO") || (isPast && status === "EN_ESPERA")}
            >
              {formatAppointmentStatus(status)}
            </button>
          ))}
        </div>
        {isFuture ? <p className="appointment-future-status-note">El estado podrá actualizarse el día de la cita.</p> : null}
        {isBeforeScheduledTime ? <p className="appointment-future-status-note">Faltó estará disponible después de la hora de la cita.</p> : null}
        {isPast ? <p className="appointment-future-status-note">Una cita vencida no puede permanecer En espera.</p> : null}

        <div className="appointment-detail-actions">
          <button type="button" className="appointment-edit-button" onClick={onEdit} disabled={isBusy}>Editar</button>
          <button type="button" className="appointment-delete-button" onClick={onDelete} disabled={isBusy}>
            {deletingAppointmentId === appointment.id ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment,
  showDate = true,
  onView
}) {
  return (
    <article className={`appointment ${statusClass(appointment.status)}`}>
      <div className="appointment-details">
        <strong>{formatAppointmentTime(appointment.time)}</strong>
        <span>{appointment.patientName}</span>
        <small>{appointment.doctor} / {appointment.room}</small>
        {showDate ? <small>{formatAppointmentDate(appointment.date)}</small> : null}
        <span className={`appointment-status-badge ${statusClass(appointment.status)}`}>
          {formatAppointmentStatus(appointment.status)}
        </span>
      </div>
      <div className="appointment-actions">
        <button type="button" className="appointment-detail-view-button" onClick={() => onView(appointment)}>Ver</button>
      </div>
    </article>
  );
}

function statusClass(status) {
  return {
    LLEGO: "arrived",
    EN_ESPERA: "waiting",
    FALTO: "missed",
    Llego: "arrived",
    Espera: "waiting",
    Falto: "missed"
  }[status] || "waiting";
}

createRoot(document.getElementById("root")).render(<App />);
