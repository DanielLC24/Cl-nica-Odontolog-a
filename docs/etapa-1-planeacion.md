# Etapa 1 — Planeación y Diseño

Documento que resume el alcance, roles, módulos, microservicios, bases de datos, pantallas, flujo principal y tecnología recomendada para el MVP de la plataforma de clínica odontológica.

## 1. Objetivo del proyecto
El sistema es una aplicación web para administrar una clínica odontológica: pacientes, doctores, citas, expedientes clínicos, odontogramas, presupuestos, pagos, archivos clínicos e inventario mediante una arquitectura basada en microservicios.

## 2. Roles de usuario
- **Administrador**: gestiona usuarios, doctores, inventario, pagos y reportes.
- **Doctor**: consulta pacientes, actualiza expediente, usa odontograma y registra tratamientos.
- **Recepcionista**: registra pacientes, agenda citas y cambia estados de cita.

## 3. Módulos principales
- Pacientes y expediente clínico
- Agenda y citas
- Odontograma interactivo
- Tratamientos y presupuestos
- Pagos y caja
- Archivos clínicos
- Inventario y proveedores
- Notificaciones
- Usuarios, login y permisos

## 4. Microservicios recomendados
- **API Gateway**: enrutamiento y autenticación básica
- **Servicio de usuarios (auth-service)**: login, JWT, roles y permisos
- **Servicio de pacientes (patients-service)**: datos personales, expediente y alertas
- **Servicio de citas (appointments-service)**: agenda, doctores, cubículos y estados
- **Servicio de odontograma (odontogram-service)**: odontogramas y tratamientos por diente
- **Servicio de pagos (billing-service)**: presupuestos, pagos, saldos y corte de caja
- **Servicio de archivos (files-service)**: subida, metadatos y enlace a almacenamiento
- **Servicio de inventario (inventory-service)**: insumos, stock y proveedores
- **Servicio de notificaciones (notifications-service)**: colas y envío de recordatorios

> Nota: Cada microservicio puede usar su propio esquema de BD; para simplificar el desarrollo local se recomienda usar instancias de PostgreSQL separadas o un único servidor con esquemas independientes.

## 5. Bases de datos (sugeridas)
- `usuarios_db` — usuarios, roles, permisos
- `pacientes_db` — patients, medical_records, alerts
- `citas_db` — doctors, cubicles, appointments, appointment_states
- `odontograma_db` — odontograms, teeth_states, tooth_treatments
- `pagos_db` — estimates, estimate_items, payments
- `archivos_db` — files metadata
- `inventario_db` — items, stock_movements, suppliers
- `notificaciones_db` — jobs, logs

## 6. Pantallas principales del dashboard
- Login
- Dashboard principal (resumen, caja, próximas citas)
- Calendario diario/semanal
- Lista de pacientes y ficha del paciente (alertas visibles)
- Expediente clínico
- Odontograma interactivo
- Presupuestos y pagos (incluye PDF)
- Archivos clínicos (galería)
- Inventario y proveedores
- Usuarios y roles

## 7. Flujo principal (paciente → pago)
1. La recepcionista registra un paciente.
2. Se agenda una cita con doctor y cubículo.
3. El paciente llega y se actualiza el estado de la cita.
4. El doctor abre el expediente y registra observaciones.
5. El doctor marca el odontograma y asigna tratamientos.
6. Se genera un presupuesto y se registra el pago parcial o total.
7. Todo queda guardado en el expediente y en el módulo financiero.

## 8. Tecnologías recomendadas
- Frontend: React.js (Vite o Create React App)
- Estilos: Tailwind CSS o CSS modular
- Backend: Node.js + Express
- BD: PostgreSQL
- Almacenamiento archivos: MinIO (S3 compatible) o almacenamiento local inicial
- Colas/notificaciones: Redis o RabbitMQ (simular en fase inicial)
- PDFs: `pdfkit` o `puppeteer` para render a PDF
- Contenedores: Docker + Docker Compose
- Autenticación: JWT

## 9. Alcance del MVP (recomendado)
Incluir en el MVP (Etapas 1–6):
- Login básico y roles
- CRUD de pacientes y ficha con alertas
- Agenda de citas (ver por día/semana, estados coloreados)
- Odontograma interactivo con guardado por paciente
- Catálogo de tratamientos y generación de presupuesto
- Registro básico de pagos y saldo pendiente

Dejar para fases posteriores:
- Integración real con WhatsApp/SMS
- Almacenamiento avanzado de radiografías (CDN/S3 en producción)
- Inventario completo y reportes avanzados
- Seguridad avanzada y pruebas de carga

## 10. Entregables para la Etapa 1
- Documento de arquitectura y alcance (este archivo).
- Diagrama general del sistema (SVG/PNG adjuntar en `docs/` si corresponde).
- Modelo de datos inicial (tablas principales y relaciones).
- Lista de endpoints mínimos por microservicio (recomendado generar en la Etapa 2).

## 11. Próximos pasos inmediatos (sugeridos)
1. Revisar y confirmar alcance del MVP.
2. Dibujar diagrama de arquitectura y flujos (agregar `docs/arquitectura.png`).
3. Crear/especificar esquemas de BD y migraciones mínimas para `patients-service` y `appointments-service`.
4. Completar `docker-compose.yml` con Postgres y MinIO para desarrollo local.

---
Documento generado para la Etapa 1: Planeación y Diseño.
