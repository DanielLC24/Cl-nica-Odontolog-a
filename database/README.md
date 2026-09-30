# Base de datos

Cada microservicio tiene su propia base de datos PostgreSQL en Docker. Los datos quedan guardados en volumenes de Docker, por lo que persisten aunque se reinicien los contenedores con `docker compose restart` o se apague y prenda Docker.

## Bases y tablas principales

- `auth_db`: usuarios, roles y credenciales cifradas para el login.
  - `users`
- `patients_db`: pacientes, expedientes clinicos y fotos/radiografias del paciente.
  - `patients`
  - `clinical_records`
  - `patient_photos`
- `doctors_db`: doctores de la clinica.
  - `doctors`
- `appointments_db`: agenda diaria/semanal, cubiculos, doctores y estados de cita.
  - `appointments`
- `odontogram_db`: estados por diente del odontograma de cada paciente.
  - `tooth_states`
- `billing_db`: tratamientos, presupuestos, pagos y corte de caja.
  - `treatments`
  - `budgets`
  - `budget_treatments`
  - `payments`
- `inventory_db`: insumos, stock minimo y proveedores.
  - `supplies`
  - `suppliers`
- `notifications_db`: bitacora de recordatorios por WhatsApp, SMS y Email.
  - `notification_logs`

## Persistencia en Docker

El archivo `docker-compose.yml` declara un volumen para cada base:

- `auth-data`
- `patients-data`
- `doctors-data`
- `appointments-data`
- `odontogram-data`
- `billing-data`
- `inventory-data`
- `notifications-data`

Mientras esos volumenes no se eliminen manualmente, la informacion registrada desde la aplicacion se mantiene despues de reiniciar los contenedores.

> Nota: `docker compose down -v` elimina los volumenes y, por lo tanto, borra las bases de datos. Para reiniciar sin borrar datos usa `docker compose restart` o `docker compose down` sin `-v`.
