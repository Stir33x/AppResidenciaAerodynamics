# App Residencia Aerodynamics

## Stack Tecnológico

| Capa               | Tecnología                                  |
| ------------------ | ------------------------------------------- |
| Frontend           | React + JavaScript + Vite + DaisyUI 5 + Tailwind CSS 4 |
| Backend            | Express 5 (Node.js)                        |
| Base de Datos      | MySQL (XAMPP) con mysql2                   |
| Autenticación      | Passport JWT (bcrypt + jsonwebtoken)       |
| Subida de archivos | multer (disco local)                       |

---

## Roles del sistema

| Rol               | Descripción                                                  |
| ----------------- | ------------------------------------------------------------ |
| **Dirección**     | Acceso total. Gestiona usuarios, incidencias, pagos, horarios, zonas comunes. |
| **Administración**| Gestiona alumnos, contratos, documentos, pagos, horarios, limpieza. |
| **Limpieza**      | Ve bloques de limpieza del día, marca habitaciones completadas, ve ausencias de estudiantes. |
| **Estudiante**    | Dashboard propio, documentos (solo lectura), incidencias (su habitación o zona común), marcar ausencia para limpieza, notificar salida. |

---

## Módulos / Funcionalidades

### 1. Autenticación y Usuarios
- Login con JWT (Passport).
- Registro de usuarios staff (dirección/administración crean cuentas de limpieza, administración, etc.).
- Perfil con nombre, email, rol, habitación (si estudiante).
- Protección de rutas según rol.

### 2. Gestión de Alumnos
- CRUD completo con validación de habitación (solo habitaciones existentes y libres).
- Selección de habitación desde lista de disponibles.
- Campo habitacion validado contra tabla rooms.
- Subida de contrato (PDF, JPG, PNG, DOC, DOCX) hasta 200MB.
- Documentos por alumno con tipos (contrato, justificante, parte, recibo, etc.).
- Carpeta por alumno: `uploads/documents/{email_prefix}/`.
- Toggle de acceso a habitación.
- Notificación de salida (activa estado pendiente_salida).
- Estados: activo, pendiente_salida, baja.

### 3. Limpieza (sistema de bloques)
- Bloques con día de semana, rango horario (hora_inicio, hora_fin) y múltiples habitaciones seleccionadas.
- Vista del día: muestra todos los bloques de hoy con sus habitaciones.
- Marcar/desmarcar habitación como completada (por día, no persistente entre días).
- Estudiantes marcan ausencias (rango horario) para que limpien sin molestar.
- Las ausencias se muestran al personal de limpieza en la vista del día.

### 4. Incidencias
- Estudiantes: solo pueden crear incidencias para su propia habitación o para zonas comunes.
- Zonas comunes gestionables por dirección/administración.
- Tipos: urgente, normal, baja.
- Estados: reportada, en_curso, resuelta, cerrada.
- Asignación a personal.
- Staff ve todas; estudiantes solo ven las suyas.

### 5. Horarios
- Gestión de horarios por tipo: transporte, cafetería, comedor, residencia, recepción, instalaciones, otros.
- Cada horario tiene: título, descripción, día semana, hora inicio/fin, ubicación.
- Vista por día (Lunes-Domingo) con tarjetas.
- Staff crea/edita/elimina; estudiantes solo ven.

### 6. Pagos
- Pagos por alumno con período, importe, fecha vencimiento, fecha cobro, estado.
- Estados: pendiente, cobrado, vencido, anulado.
- **Generación periódica**: seleccionar alumno, importe por recibo, frecuencia (1, 2, 3, 6, 12 meses) y número de recibos.
- Cada alumno tiene importe por recibo y frecuencia almacenados.
- Fecha de vencimiento: día 5 del mes siguiente.

### 7. Documentos
- Cada alumno tiene su carpeta de documentos.
- Staff puede subir cualquier tipo de documento.
- Estudiantes solo ven y descargan (no modifican).
- Los archivos se sirven con autenticación mediante endpoint dedicado.
- Tipos: contrato, documento, justificante, parte, recibo, otro.

### 8. Habitaciones
- Grid de habitaciones (101-105, 201-205, 301-305).
- CRUD básico.
- Endpoint `/api/rooms/available` que excluye habitaciones ocupadas.

### 9. Dashboard por rol
- **Dirección/Admin**: tarjetas con estadísticas (alumnos activos, limpieza hoy, incidencias abiertas).
- **Limpieza**: bloques de limpieza de hoy con habitaciones y ausencias.
- **Estudiante**: información de habitación, limpieza del día, ausencia, últimas incidencias.

---

## Estructura del Proyecto

```
/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── students.js
│   │   │   ├── payments.js
│   │   │   ├── rooms.js
│   │   │   ├── incidents.js
│   │   │   ├── cleaning.js
│   │   │   ├── common-zones.js
│   │   │   ├── horarios.js
│   │   │   └── users.js
│   │   ├── middleware/
│   │   │   ├── auth.js        (Passport JWT + requireRole)
│   │   │   └── upload.js      (multer, 200MB, pdf/jpg/png/doc)
│   │   ├── passport.js        (estrategia JWT)
│   │   ├── db.js              (pool mysql2)
│   │   └── index.js           (entry point)
│   ├── uploads/
│   │   └── documents/
│   │       └── {email_prefix}/ (carpeta por alumno)
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx     (sidebar con navegación)
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StudentsPage.jsx
│   │   │   ├── CleaningPage.jsx
│   │   │   ├── IncidentsPage.jsx
│   │   │   ├── SchedulesPage.jsx
│   │   │   ├── PaymentsPage.jsx
│   │   │   ├── RoomsPage.jsx
│   │   │   ├── DocumentsPage.jsx
│   │   │   └── UsersPage.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   └── api.js         (fetch wrapper con JWT)
│   │   └── App.jsx            (router)
│   ├── package.json
│   └── .env
├── database/
│   ├── schema.sql             (DDL completo con drops)
│   └── init.js                (script de inicialización)
└── PROJECT_DOCS.md
```

---

## Base de Datos

### `profiles`
| Campo         | Tipo         | Descripción                    |
|---------------|--------------|--------------------------------|
| id            | INT PK       |                                |
| email         | VARCHAR(255) | UNIQUE                         |
| password_hash | VARCHAR(255) |                                |
| nombre        | VARCHAR(100) |                                |
| apellidos     | VARCHAR(100) |                                |
| telefono      | VARCHAR(20)  |                                |
| rol           | ENUM         | direccion, administracion, limpieza, estudiante |
| created_at    | TIMESTAMP    |                                |

### `students`
| Campo               | Tipo         | Descripción                           |
| ------------------- | ------------ | ------------------------------------- |
| id                  | INT PK       |                                       |
| profile_id          | INT FK       | -> profiles(id)                       |
| habitacion          | VARCHAR(20)  | validada contra rooms(nombre)         |
| fecha_entrada       | DATE         |                                       |
| fecha_salida_prevista | DATE       |                                       |
| fecha_salida_real   | DATE         |                                       |
| acceso_habitacion   | TINYINT(1)   | default 1                             |
| contrato_url        | VARCHAR(500) |                                       |
| cuota_mensual       | DECIMAL(10,2)| default 0.00 (importe por recibo)     |
| facturar_cada       | INT          | default 1 (meses entre cargos)        |
| estado              | ENUM         | activo, pendiente_salida, baja        |
| created_at          | TIMESTAMP    |                                       |

### `cleaning_blocks`
| Campo       | Tipo         | Descripción                    |
|-------------|--------------|--------------------------------|
| id          | INT PK       |                                |
| dia_semana  | VARCHAR(20)  | Lunes, Martes...               |
| hora_inicio | TIME         |                                |
| hora_fin    | TIME         |                                |
| created_at  | TIMESTAMP    |                                |

### `cleaning_block_rooms`
| Campo            | Tipo    | Descripción                           |
|------------------|---------|---------------------------------------|
| id               | INT PK  |                                       |
| block_id         | INT FK  | -> cleaning_blocks(id)                |
| room_name        | VARCHAR(20) | nombre de habitación               |
| completada_por   | INT FK  | -> profiles(id)                       |
| fecha_completada | DATE    | NULL si no completada hoy             |

### `student_absences`
| Campo       | Tipo    | Descripción                       |
|-------------|---------|-----------------------------------|
| id          | INT PK  |                                   |
| student_id  | INT FK  | -> students(id)                   |
| fecha       | DATE    |                                   |
| hora_inicio | TIME    |                                   |
| hora_fin    | TIME    |                                   |
| created_at  | TIMESTAMP|                                  |

### `incidencias`
| Campo         | Tipo    | Descripción                           |
|---------------|---------|---------------------------------------|
| id            | INT PK  |                                       |
| reportado_por | INT FK  | -> profiles(id)                       |
| habitacion    | VARCHAR(20) | habitación o zona común            |
| tipo          | ENUM    | urgente, normal, baja                 |
| descripcion   | TEXT    |                                       |
| estado        | ENUM    | reportada, en_curso, resuelta, cerrada|
| asignado_a    | INT FK  | -> profiles(id)                       |
| created_at    | TIMESTAMP|                                      |
| resuelta_at   | TIMESTAMP|                                      |

### `common_zones`
| Campo    | Tipo         | Descripción         |
|----------|--------------|---------------------|
| id       | INT PK       |                     |
| nombre   | VARCHAR(100) | UNIQUE             |
| created_at | TIMESTAMP  |                     |

### `horarios`
| Campo       | Tipo    | Descripción                                |
|-------------|---------|--------------------------------------------|
| id          | INT PK  |                                            |
| tipo        | ENUM    | transporte, residencia, cafeteria, comedor, recepción, instalaciones, otros |
| titulo      | VARCHAR(255)|                                       |
| descripcion | TEXT    |                                            |
| dia_semana  | VARCHAR(20)|                                       |
| hora_inicio | TIME    |                                            |
| hora_fin    | TIME    |                                            |
| ubicacion   | VARCHAR(255)|                                       |
| created_at  | TIMESTAMP|                                            |

### `pagos`
| Campo             | Tipo    | Descripción                       |
|-------------------|---------|-----------------------------------|
| id                | INT PK  |                                   |
| student_id        | INT FK  | -> students(id)                   |
| periodo           | VARCHAR(20)| ej. "junio de 2026"            |
| importe           | DECIMAL(10,2)|                               |
| fecha_vencimiento | DATE    |                                   |
| fecha_cobro       | DATE    |                                   |
| estado            | ENUM    | pendiente, cobrado, vencido, anulado |
| referencia_mandato| VARCHAR(100)|                               |
| created_at        | TIMESTAMP|                                  |

### `rooms`
| Campo    | Tipo         | Descripción         |
|----------|--------------|---------------------|
| id       | INT PK       |                     |
| nombre   | VARCHAR(20)  | UNIQUE              |
| created_at | TIMESTAMP  |                     |

### `documents`
| Campo            | Tipo    | Descripción                       |
|------------------|---------|-----------------------------------|
| id               | INT PK  |                                   |
| student_id       | INT FK  | -> students(id)                   |
| tipo             | VARCHAR(50)| contrato, justificante, etc.   |
| nombre_original  | VARCHAR(255)|                               |
| archivo_ruta     | VARCHAR(500)| ruta relativa                  |
| mime_type        | VARCHAR(100)|                               |
| tamano           | INT     | en bytes                          |
| subido_por       | INT FK  | -> profiles(id)                   |
| created_at       | TIMESTAMP|                                  |

Otras tablas: `checklist_entrada`, `checklist_salida`, `salida_notificaciones` (sin implementar en frontend aún).

---

## API Endpoints

### Auth (`/api/auth`)
| Método | Ruta       | Auth     | Descripción                    |
|--------|------------|----------|--------------------------------|
| POST   | /register  | No       | Registrar (público, uso interno) |
| POST   | /login     | No       | Iniciar sesión, devuelve JWT   |
| GET    | /me        | JWT      | Perfil del usuario autenticado |

### Students (`/api/students`)
| Método | Ruta                    | Auth | Roles                | Descripción                          |
|--------|-------------------------|------|----------------------|--------------------------------------|
| GET    | /                       | JWT  | todos                | Listar alumnos                       |
| GET    | /:id                    | JWT  | todos                | Detalle alumno                       |
| POST   | /                       | JWT  | direccion, admin     | Crear alumno (crea profile + student)|
| PUT    | /:id                    | JWT  | direccion, admin     | Actualizar alumno                    |
| POST   | /:id/contrato           | JWT  | todos (subida propia)| Subir contrato                       |
| POST   | /:id/notificar-salida   | JWT  | estudiante           | Notificar salida                     |
| PUT    | /:id/acceso             | JWT  | direccion, admin     | Toggle acceso                        |
| GET    | /:id/documentos         | JWT  | todos                | Listar documentos del alumno         |
| POST   | /:id/documentos         | JWT  | direccion, admin     | Subir documento (con tipo)           |
| DELETE | /:id/documentos/:docId  | JWT  | direccion, admin     | Eliminar documento (borra archivo)   |
| GET    | /:id/documentos/:docId/download | JWT | todos        | Descargar/ver documento              |

### Payments (`/api/pagos`)
| Método | Ruta       | Auth | Roles            | Descripción                          |
|--------|------------|------|------------------|--------------------------------------|
| GET    | /          | JWT  | todos            | Listar pagos (filtro por estado, student_id) |
| GET    | /:id       | JWT  | todos            | Detalle pago                         |
| POST   | /          | JWT  | direccion, admin | Crear pago                           |
| PUT    | /:id       | JWT  | direccion, admin | Actualizar pago                      |
| DELETE | /:id       | JWT  | direccion        | Eliminar pago                        |
| POST   | /generar   | JWT  | direccion, admin | Generar recibos periódicos           |

### Rooms (`/api/rooms`)
| Método | Ruta       | Auth | Roles            | Descripción                          |
|--------|------------|------|------------------|--------------------------------------|
| GET    | /          | JWT  | todos            | Listar habitaciones                  |
| POST   | /          | JWT  | direccion, admin | Crear habitación                     |
| DELETE | /:id       | JWT  | direccion, admin | Eliminar habitación                  |
| GET    | /available | JWT  | todos            | Habitaciones libres (no ocupadas)    |

### Incidents (`/api/incidencias`)
| Método | Ruta              | Auth | Roles                       | Descripción                    |
|--------|-------------------|------|-----------------------------|--------------------------------|
| GET    | /                 | JWT  | todos (estudiante solo suyas)| Listar incidencias             |
| GET    | /:id              | JWT  | todos                       | Detalle                        |
| POST   | /                 | JWT  | todos                       | Crear (estudiante: validado)   |
| PUT    | /:id              | JWT  | staff                       | Cambiar estado/asignar         |
| GET    | /staff/lista      | JWT  | staff                       | Lista de personal para asignar |

### Cleaning (`/api/cleaning`)
| Método | Ruta                   | Auth | Roles     | Descripción                          |
|--------|------------------------|------|-----------|--------------------------------------|
| GET    | /blocks                | JWT  | staff     | Listar bloques                       |
| POST   | /blocks                | JWT  | staff     | Crear bloque con habitaciones        |
| DELETE | /blocks/:id            | JWT  | staff     | Eliminar bloque                      |
| GET    | /today                 | JWT  | todos     | Bloques de hoy con habitaciones y ausencias |
| POST   | /rooms/:id/complete    | JWT  | limpieza  | Marcar/desmarcar completada          |
| POST   | /absence               | JWT  | estudiante| Crear/actualizar ausencia del día    |
| GET    | /absence               | JWT  | estudiante| Obtener ausencia del día             |

### Common Zones (`/api/common-zones`)
| Método | Ruta    | Auth | Roles            | Descripción              |
|--------|---------|------|------------------|--------------------------|
| GET    | /       | JWT  | todos            | Listar zonas comunes     |
| POST   | /       | JWT  | direccion, admin | Crear zona común         |
| DELETE | /:id    | JWT  | direccion, admin | Eliminar zona común      |

### Horarios (`/api/horarios`)
| Método | Ruta    | Auth | Roles            | Descripción              |
|--------|---------|------|------------------|--------------------------|
| GET    | /       | JWT  | todos            | Listar (filtro por tipo) |
| POST   | /       | JWT  | direccion, admin | Crear                    |
| PUT    | /:id    | JWT  | direccion, admin | Editar                   |
| DELETE | /:id    | JWT  | direccion, admin | Eliminar                 |

### Users (`/api/users`)
| Método | Ruta    | Auth | Roles            | Descripción              |
|--------|---------|------|------------------|--------------------------|
| GET    | /       | JWT  | direccion, admin | Listar usuarios          |
| POST   | /       | JWT  | direccion, admin | Crear usuario (staff)    |
| PUT    | /:id    | JWT  | direccion, admin | Editar usuario           |
| DELETE | /:id    | JWT  | direccion        | Eliminar usuario         |

### Stats
| Método | Ruta       | Auth | Roles     | Descripción                    |
|--------|------------|------|-----------|--------------------------------|
| GET    | /api/stats | JWT  | staff     | Contadores (alumnos activos, incidencias abiertas, pagos pendientes) |

---

### Rutas del Frontend

| Ruta            | Página           | Visibilidad              |
|-----------------|------------------|--------------------------|
| /login          | Login            | Público                  |
| /dashboard      | Dashboard        | Todos                    |
| /alumnos        | StudentsPage     | Staff                    |
| /limpieza       | CleaningPage     | Staff + limpieza         |
| /incidencias    | IncidentsPage    | Todos                    |
| /horarios       | SchedulesPage    | Todos                    |
| /documentos     | DocumentsPage    | Todos (staff admin, estudiante solo lectura) |
| /pagos          | PaymentsPage     | Staff                    |
| /habitaciones   | RoomsPage        | Staff                    |
| /usuarios       | UsersPage        | Staff                    |

---

## Configuración Local

1. Arrancar XAMPP MySQL.
2. `cd backend && npm install`
3. `cd frontend && npm install`
4. Copiar `backend/.env.example` a `backend/.env` (DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET).
5. Ejecutar `node database/init.js` para crear BD y datos iniciales.
6. `cd backend && npm start` (puerto 3000).
7. `cd frontend && npm run dev` (puerto 5173, proxy a 3000).

Usuario por defecto: `rodriguezruizalberto14@gmail.com` / `qwerty12345` (rol direccion).

---

## Notas Técnicas

- DaisyUI 5 + Tailwind CSS 4 NO incluye colores arbitrarios como `bg-blue-50`. Usar `bg-base-100`, `bg-base-200` o tokens DaisyUI.
- Los archivos subidos se almacenan en `backend/uploads/documents/{email_prefix}/` y se sirven mediante endpoint con autenticación JWT (no acceso directo).
- El límite de subida es 200MB.
- Los bloques de limpieza usan `fecha_completada` por día en `cleaning_block_rooms` (la misma habitación puede completarse en días distintos).
- Las ausencias de estudiantes se almacenan por fecha en `student_absences` (una por estudiante y día, se actualiza si ya existe).
