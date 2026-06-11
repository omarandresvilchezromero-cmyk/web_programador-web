# Sistema de Reclutamiento Interno - Guía de Uso

## 📋 Descripción General

El Sistema de Reclutamiento Interno es una plataforma para que los usuarios puedan solicitar formar parte del equipo técnico de soporte y servicios tecnológicos. Incluye:

- **Página de Solicitud**: Formulario moderno para que los candidatos presenten sus solicitudes
- **Panel Administrativo**: Panel de gestión para que los administradores revisen y aprueben solicitudes
- **Sistema de Empleados**: Registro automático de empleados aceptados con ID único e insignia verificada

---

## 🚀 Cómo Usar la Plataforma

### Para Usuarios Candidatos

#### 1. Acceder a la Página de Solicitud
- Ve a: `vacantes de trabajo.html`
- La página mostrará la información sobre los beneficios de ser empleado
- Verás el formulario y el proceso de selección

#### 2. Completar el Formulario
El formulario incluye los siguientes campos:

- **Nombre Completo** (requerido)
  - Mínimo 5 caracteres
  
- **Fecha de Nacimiento** (requerido)
  - Debes ser mayor de 18 años
  
- **Especialidad Principal** (requerido)
  - Elige entre 9 opciones:
    - Desarrollo Web
    - Desarrollo Backend
    - Bases de Datos
    - Redes
    - Ciberseguridad
    - Soporte Técnico
    - Diseño UI/UX
    - Reparación y Mantenimiento
    - Servidores

- **Años de Experiencia** (requerido)
  - Número entre 0 y 60

- **Habilidades Técnicas** (requerido)
  - Mínimo 20 caracteres
  - Describe tecnologías, herramientas o lenguajes que dominas

- **Disponibilidad** (requerido - múltiples opciones)
  - Elige al menos una:
    - Tiempo completo
    - Medio tiempo
    - Freelance
    - Remoto
    - Presencial
    - Híbrido

- **¿Por qué deseas formar parte del equipo?** (requerido)
  - Mínimo 30 caracteres
  - Explica tu motivación

#### 3. Validación en Tiempo Real
- Los campos se validan mientras escribes
- Recibirás mensajes de error descriptivos si algo no cumple los requisitos
- Todos los campos son obligatorios

#### 4. Enviar Solicitud
- Haz clic en "Enviar Solicitud"
- Recibirás una confirmación visual de que tu solicitud fue registrada
- Tu solicitud tendrá estado "pendiente" hasta que sea revisada

---

### Para Administradores

#### 1. Acceder al Panel Administrativo
- Ve a: `admin-solicitudes.html`

**Nota**: Para acceder al panel administrativo, el sistema verifica si eres administrador. Para habilitar el acceso de administrador:

```javascript
// Ejecuta esto en la consola del navegador para habilitar acceso temporal:
localStorage.setItem('isAdmin', 'true');
```

O en tu aplicación de autenticación, establece:
```javascript
localStorage.setItem('isAdmin', 'true');
// o
sessionStorage.setItem('userRole', 'admin');
```

#### 2. Interfaz del Panel

El panel está organizado en 4 tabs principales:

##### **TAB 1: Solicitudes Pendientes** (⏳)
- Muestra todas las solicitudes que requieren revisión
- Para cada solicitud puedes:
  - **Aceptar**: Aprueba la solicitud y crea un empleado
  - **Rechazar**: Rechaza la solicitud con un motivo
  - **Ver Detalles**: Abre un modal con toda la información

##### **TAB 2: Solicitudes Aceptadas** (✓)
- Muestra solicitudes que han sido aprobadas
- Incluyen el ID de empleado asignado
- Puedes ver todos los detalles

##### **TAB 3: Solicitudes Rechazadas** (✗)
- Muestra solicitudes que fueron rechazadas
- Incluyen la razón del rechazo
- Útil para referencia

##### **TAB 4: Empleados Activos** (👥)
- Listado de todos los empleados registrados
- Información detallada de cada empleado
- Búsqueda y filtrado por:
  - Nombre
  - ID de empleado
  - Especialidad

#### 3. Procesar una Solicitud Pendiente

**Para Aceptar:**
1. Abre el tab de "Solicitudes Pendientes"
2. Encuentra la solicitud que deseas aceptar
3. Haz clic en "Aceptar"
4. Confirma en el diálogo que aparece
5. El sistema automáticamente:
   - Genera un ID de empleado único
   - Crea un registro en la lista de empleados
   - Asigna una insignia de "Empleado Verificado"
   - Cambia el estado de la solicitud a "aceptada"

**Para Rechazar:**
1. Abre el tab de "Solicitudes Pendientes"
2. Haz clic en "Rechazar"
3. Un modal aparecerá pidiendo la razón del rechazo
4. Escribe una razón clara y constructiva
5. Haz clic en "Confirmar Rechazo"
6. El estado cambiad a "rechazada"

#### 4. Ver Detalles de Solicitud

1. Haz clic en "Ver Detalles" en cualquier solicitud
2. Se abrirá un modal mostrando:
   - Información personal
   - Especialidad y experiencia
   - Habilidades técnicas
   - Motivación
   - Disponibilidad
   - Fecha de solicitud
   - Si está aceptada: ID de empleado e insignia
   - Si está rechazada: Razón del rechazo

#### 5. Administrar Empleados

En el tab "Empleados Activos":
- **Buscar**: Escribe nombre, ID de empleado o especialidad
- **Filtrar por Especialidad**: Usa el dropdown para filtrar
- Cada tarjeta de empleado muestra:
  - Nombre
  - ID de empleado único
  - Especialidad
  - Años de experiencia
  - Disponibilidad
  - Fecha de ingreso
  - Rating (estrellas)

---

## 💾 Almacenamiento de Datos

El sistema utiliza **localStorage** del navegador para almacenar datos. Esto significa:

### Datos Almacenados:

1. **`solicitudesEquipo`**: Array de todas las solicitudes
2. **`empleados`**: Array de empleados registrados
3. **`solicitudesBackup`**: Backup de solicitudes con timestamps

### Estructura de Solicitud:

```javascript
{
    id: "SOL-1706234567890-ABC123XYZ",
    nombreCompleto: "Juan Pérez García",
    fechaNacimiento: "1995-03-15",
    edad: 28,
    especialidad: "desarrollo-web",
    anosExperiencia: 5,
    habilidades: "JavaScript, React, Node.js, MongoDB...",
    disponibilidad: ["tiempo-completo", "remoto"],
    motivacion: "Me motiva...",
    estado: "pendiente", // o "aceptada", "rechazada"
    fechaSolicitud: "2024-01-26T10:30:00Z",
    idEmpleado: null, // Se asigna al aceptar
    insignia: null,
    razonRechazo: null // Se asigna al rechazar
}
```

### Estructura de Empleado:

```javascript
{
    idEmpleado: "EMP-1706234567890-ABC12",
    nombreCompleto: "Juan Pérez García",
    especialidad: "desarrollo-web",
    anosExperiencia: 5,
    habilidades: "JavaScript, React, Node.js, MongoDB...",
    disponibilidad: ["tiempo-completo", "remoto"],
    insignia: "empleado-verificado-EMP-1706234567890-ABC12",
    fechaIngreso: "2024-01-26T10:30:00Z",
    estado: "activo",
    rating: 5.0,
    solicitudId: "SOL-1706234567890-ABC123XYZ"
}
```

---

## 🎨 Colores y Diseño

El sistema utiliza un esquema de colores moderno:

- **Negro**: #0F172A (fondo principal)
- **Morado**: #7C3AED (acentos primarios)
- **Azul Neón**: #22D3EE (acentos secundarios)
- **Gris**: #94A3B8 (texto secundario)
- **Blanco**: #F8FAFC (texto principal)

---

## 🔐 Seguridad y Validaciones

### Validaciones en el Formulario:

1. **Nombre Completo**: Mínimo 5 caracteres
2. **Fecha de Nacimiento**: Mayor de 18 años
3. **Habilidades**: Mínimo 20 caracteres
4. **Motivación**: Mínimo 30 caracteres
5. **Disponibilidad**: Al menos una opción seleccionada

### Próximas Mejoras de Seguridad:

- Integración con servidor backend
- Autenticación de usuarios
- Encriptación de datos
- Validación en servidor
- Sistema de roles más complejo

---

## 🔧 Integración con Servidor Backend

Actualmente, los datos se guardan en `localStorage`. Para integrar con un servidor:

1. **Descomenta** la función `sendToServer()` en `reclutamiento.js`
2. Configura los endpoints de tu API:
   - `POST /api/solicitudes` - Para enviar nuevas solicitudes
   - `GET /api/solicitudes` - Para obtener solicitudes
   - `PUT /api/solicitudes/:id` - Para actualizar solicitud
   - `POST /api/empleados` - Para crear empleado

Ejemplo de integración:

```javascript
async function sendToServer(solicitud) {
    const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitud)
    });
    return await response.json();
}
```

---

## 📊 Funciones Disponibles en el Navegador

Desde la consola del navegador, puedes usar estas funciones:

```javascript
// Obtener todas las solicitudes
reclutamiento.getAllSolicitudes()

// Obtener solicitud por ID
reclutamiento.getSolicitudById('SOL-xxx')

// Obtener todos los empleados
reclutamiento.getAllEmployees()

// Actualizar estado de solicitud
reclutamiento.updateSolicitudStatus('SOL-xxx', 'aceptada')

// Rechazar solicitud
reclutamiento.rejectSolicitud('SOL-xxx', 'No cumple criterios')

// Aceptar solicitud
reclutamiento.acceptSolicitud('SOL-xxx')
```

---

## 🐛 Solución de Problemas

### Las solicitudes no se guardan
- Verifica que localStorage esté habilitado en tu navegador
- Comprueba en DevTools → Application → Local Storage

### No puedo acceder al panel administrativo
- Habilita el acceso de administrador:
  ```javascript
  localStorage.setItem('isAdmin', 'true');
  ```
- Recarga la página

### Los datos desaparecen al borrar el navegador
- Esto es normal con localStorage
- Para persistencia permanente, necesitas un servidor backend

---

## 📞 Contacto y Soporte

Para más información o sugerencias sobre el sistema:
- Contacta al administrador del sistema
- Email: admin@plataforma.com
- Teléfono: +34 XXX XXX XXX

---

## ✅ Checklist de Implementación

- ✓ Página de solicitud con formulario completo
- ✓ Panel administrativo completo
- ✓ Validaciones en cliente
- ✓ Almacenamiento en localStorage
- ✓ Generación de IDs de empleado
- ✓ Asignación de insignias
- ✓ Diseño moderno y responsivo
- ✓ Animaciones suaves
- ✓ Sistema de búsqueda y filtrado
- ⏳ Integración con servidor (próximo paso)
- ⏳ Envío de emails de confirmación (próximo paso)
- ⏳ Sistema de notificaciones (próximo paso)

---

**Versión**: 1.0  
**Última actualización**: 26 de Enero de 2024  
**Desarrollado por**: Omar Vílchez
