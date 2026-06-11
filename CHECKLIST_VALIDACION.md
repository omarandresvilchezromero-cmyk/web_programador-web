# ✅ CHECKLIST DE VALIDACIÓN RÁPIDA - FASE 1

**Usar este checklist para verificar que todo está en orden**

---

## 📋 PASO 1: Verificar Archivos

- [ ] `htmls/javascript/login-nuevo.js` existe (163 líneas)
- [ ] `htmls/javascript/login-ui.js` existe (240 líneas)
- [ ] `htmls/test-auth.html` existe
- [ ] `htmls/javascript/login.js.DESACTIVADO` existe
- [ ] `htmls/javascript/sistema-usuarios.js.DESACTIVADO` existe
- [ ] `htmls/javascript/config.js.DESACTIVADO` existe

---

## 📋 PASO 2: Verificar login.html

Abrir `htmls/login.html` y verificar:

```html
<!-- DEBE TENER: -->
<script src="javascript/login-nuevo.js"></script>
<script src="javascript/login-ui.js"></script>

<!-- NO DEBE TENER: -->
<!-- DESCOMENTAR SI EXISTEN:
<script src="javascript/config.js"></script>
<script src="javascript/sistema-usuarios.js"></script>
<script src="javascript/sistema-historial.js"></script>
-->
```

- [ ] login-nuevo.js está referenciado
- [ ] login-ui.js está referenciado
- [ ] config.js NO está referenciado
- [ ] sistema-usuarios.js NO está referenciado
- [ ] sistema-historial.js NO está referenciado

---

## 📋 PASO 3: Verificar Server

En terminal, navegar a `htmls/javascript/`:

```bash
cd htmls/javascript
node server.js
```

Debe mostrar:
```
SESSION CONFIG: {...}
Server running on port 3000
```

- [ ] Server inicia sin errores
- [ ] Puerto 3000 está disponible
- [ ] No hay errores de conexión MySQL

---

## 📋 PASO 4: Probar test-auth.html

1. Abrir navegador: `http://localhost:3000/test-auth.html`
2. Abre consola (F12)

### Test de Registro:
- [ ] Ingresa: nombre="testuser", email="test@test.com", password="test123"
- [ ] Hace clic en "Registrar"
- [ ] Consola muestra: ✅ Usuario registrado
- [ ] Resultado muestra ID y email

### Test de Login:
- [ ] Ingresa: email="test@test.com", password="test123"
- [ ] Hace clic en "Iniciar Sesión"
- [ ] Consola muestra: ✅ Login exitoso
- [ ] Estado muestra: "Sesión: ✅ Activa"

### Test de Sesión:
- [ ] Hace clic en "Verificar Sesión Actual"
- [ ] Resultado muestra usuario actual
- [ ] Hace clic en "Obtener Perfil"
- [ ] Resultado muestra perfil completo

### Test de Logout:
- [ ] Hace clic en "Cerrar Sesión"
- [ ] Consola muestra: ✅ Logout exitoso
- [ ] Estado muestra: "Sesión: ❌ Inactiva"

---

## 📋 PASO 5: Verificar Consola (F12)

En test-auth.html, abre consola y verifica NO hay mensajes rojos (❌ errores)

Debe ver:
```
✅ Página cargada
📝 Registrando: {nombre, email}
✅ Registro exitoso: {...}
🔐 Iniciando sesión: {email}
✅ Login exitoso: {...}
🔍 Verificando sesión...
✅ Sesión activa: {...}
👤 Obteniendo perfil...
✅ Perfil: {...}
🚪 Cerrando sesión...
✅ Logout exitoso
```

- [ ] No hay errores rojos
- [ ] Todos los pasos muestran ✅ (éxito)
- [ ] Mensajes son coherentes

---

## 📋 PASO 6: Verificar Persistencia de Sesión

En test-auth.html:
1. Hace login
2. Abre otra pestaña: `http://localhost:3000/test-auth.html`
3. Hace clic en "Mostrar Estado"

- [ ] Segunda pestaña muestra mismo usuario
- [ ] No necesita hacer login de nuevo
- [ ] Sesión persiste entre pestañas

---

## 📋 PASO 7: Verificar Logout Limpia Sesión

En test-auth.html:
1. Hace login
2. Hace logout
3. Abre otra pestaña: `http://localhost:3000/test-auth.html`
4. Hace clic en "Mostrar Estado"

- [ ] Segunda pestaña muestra "Sesión: ❌ Inactiva"
- [ ] Usuario está vacío
- [ ] No persiste después de logout

---

## 🎯 RESULTADO FINAL

Si todos los pasos pasan:

```
✅ FASE 1 COMPLETADA EXITOSAMENTE
```

**Próximo paso:** Esperar aprobación para iniciar **FASE 2**

---

## 🆘 PROBLEMAS

Si algo falla, verificar:

| Problema | Solución |
|----------|----------|
| "Cannot GET /" | Server no está corriendo |
| "ERR_CONNECTION_REFUSED" | Puerto 3000 no disponible |
| "autenticacion is not defined" | login-nuevo.js no cargó |
| "No hay sesión activa" después de login | CORS o cookies no funcionan |
| Errores SQL en consola | Verificar conexión MySQL en server.js |

---

**Estimado:** 15-20 minutos para completar
