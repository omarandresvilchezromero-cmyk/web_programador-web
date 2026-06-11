# 📋 FASE 2 - GUÍA DE INTEGRACIÓN

**Ejecutar SOLO después de que test-auth.html funcione 100%**

---

## 🔄 ORDEN DE INTEGRACIÓN

Actualizar estos archivos HTML EN ORDEN:

### 1. `perfil.html`
**Objetivo:** Cambiar de localStorage a `/api/profile`

**Buscar y Reemplazar:**

```javascript
// ANTES: localStorage
const perfil = JSON.parse(localStorage.getItem('perfil'));

// DESPUÉS: API
async function cargarPerfil() {
    const resultado = await autenticacion.obtenerPerfil();
    if (resultado.exito) {
        mostrarPerfil(resultado.user);
    } else {
        window.location.href = 'login.html';
    }
}
cargarPerfil();
```

**Verificar que exista:**
- `<script src="javascript/login-nuevo.js"></script>`

---

### 2. `htmlproyecto.html`
**Objetivo:** Verificar que solo entra si hay sesión

**Añadir al principio:**
```javascript
// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async () => {
    const sesion = await autenticacion.obtenerSesion();
    if (!sesion.usuario) {
        window.location.href = 'login.html';
    }
});
```

---

### 3. `chat.html`
**Objetivo:** Verificar que solo entra si hay sesión

**Igual que htmlproyecto.html**

---

### 4. `notificaciones.html`
**Objetivo:** Verificar que solo entra si hay sesión

**Igual que htmlproyecto.html**

---

### 5. `admin-dashboard.html`
**Objetivo:** Verificar que solo entra si es admin

**Código:**
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    const sesion = await autenticacion.obtenerSesion();
    if (!sesion.usuario || sesion.usuario.rol.toLowerCase() !== 'admin') {
        alert('Solo administradores pueden acceder');
        window.location.href = 'htmlproyecto.html';
    }
});
```

---

### 6. `admin-usuarios.html`
**Objetivo:** Verificar que solo entra si es admin

**Igual que admin-dashboard.html**

---

### 7. `admin-solicitudes.html`
**Objetivo:** Verificar que solo entra si es admin

**Igual que admin-dashboard.html**

---

## ✅ CHECKLIST POR ARCHIVO

### Antes de modificar cada archivo:

- [ ] Hacer backup (Ctrl+K, Ctrl+D en VS Code)
- [ ] Buscar referencias a `localStorage.getItem`
- [ ] Buscar referencias a `sessionStorage`
- [ ] Buscar referencias a `gestor.iniciarSesion`
- [ ] Buscar referencias a `sistema-usuarios.js`
- [ ] Reemplazar con llamadas a `autenticacion.`

### Después de modificar:

- [ ] Verificar que incluye `<script src="javascript/login-nuevo.js"></script>`
- [ ] Abrir página en navegador
- [ ] Verificar consola (F12) - No debe haber errores rojos
- [ ] Hacer logout desde otra pestaña y refrescar - Debe ir a login

---

## 🚨 PROBLEMAS COMUNES

### Error: "autenticacion is not defined"
**Causa:** Falta el script de login-nuevo.js
**Solución:** Añadir `<script src="javascript/login-nuevo.js"></script>`

### Error: "usuario.rol is undefined"
**Causa:** El usuario no está en la sesión
**Solución:** Verificar que se llamó `await autenticacion.obtenerSesion()`

### Cookie de sesión no persiste
**Causa:** CORS o credentials no configurados
**Solución:** Ya está bien en login-nuevo.js (credentials: 'include')

---

## 🔍 VERIFICACIÓN

Para cada página, ejecutar esto en consola (F12):
```javascript
// Debe devolver usuario actual
const sess = await autenticacion.obtenerSesion();
console.log(sess.usuario);

// Debe devolver perfil
const prof = await autenticacion.obtenerPerfil();
console.log(prof.user);
```

---

## 📝 NOTAS IMPORTANTES

1. **NO tocar** archivos de carrito, mensajes, notificaciones, reclutamiento
2. **SI tocar** solo los 7 HTML listados arriba
3. **GUARDAR BACKUPS** antes de cambiar cada archivo
4. **PROBAR DESPUÉS** de cada cambio

---

## 🎯 CRITERIO DE ÉXITO - FASE 2

✅ Completada cuando:
- Usuario puede hacer login en `login.html`
- Usuario ve su perfil en `perfil.html`
- Usuario ve su dashboard en `htmlproyecto.html`
- Admin puede acceder a admin pages
- Logout funciona desde cualquier página
- Refrescar página mantiene la sesión

---

**Duración estimada:** 1-2 horas
**Dificultad:** Media
