# ProyectoMoviles

App web para administrar una clinica odontologica usando React, Node.js, Express, PostgreSQL, Docker y una arquitectura basada en microservicios.

## Modulos del MVP

- Login y roles basicos
- Pacientes y expediente clinico
- Agenda de citas
- Odontograma interactivo basico
- Tratamientos, presupuestos y pagos

## Servicios iniciales

- `api-gateway`: punto de entrada para el frontend.
- `auth-service`: autenticacion, usuarios y roles.
- `patients-service`: pacientes, expediente y alertas medicas.
- `appointments-service`: agenda, doctores, cubiculos y estados de cita.
- `odontogram-service`: dientes, diagnosticos y tratamientos por paciente.
- `billing-service`: tratamientos, presupuestos, pagos y saldos.

## Como ejecutar

Requisitos:

- Node.js
- Docker Desktop

Comandos:

```bash
docker compose up --build
```

URLs principales:

- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3001
- Patients Service: http://localhost:3002
- Appointments Service: http://localhost:3003
- Odontogram Service: http://localhost:3004
- Billing Service: http://localhost:3005

## Etapas

1. Planeacion y diseno
2. Estructura base del proyecto
3. Pacientes y expediente clinico
4. Agenda y citas
5. Odontograma interactivo
6. Tratamientos, presupuestos y pagos
7. Archivos clinicos
8. Inventario y proveedores
9. Notificaciones
10. Seguridad, pruebas y presentacion
