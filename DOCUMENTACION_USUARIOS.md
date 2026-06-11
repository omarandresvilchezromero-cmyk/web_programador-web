# 📋 Sistema de Registro y Login - Documentación

## 🎯 ¿Qué se creó?

He implementado un **sistema completo de registro y login** con almacenamiento local (localStorage) que incluye:

### ✨ Características Principales:

1. **REGISTRO DE USUARIOS**
   - El usuario ingresa: Nombre, Correo, Contraseña
   - Validaciones: Email único, contraseña mínimo 6 caracteres
   - **ID de 4 dígitos único** generado automáticamente
   - **Fecha de creación** registrada automáticamente
   - Los datos se guardan en localStorage

2. **LOGIN/INICIAR SESIÓN**
   - El usuario ingresa: Correo, Contraseña
   - Validación de credenciales contra los datos registrados
   - Solo permite entrar si la cuenta existe y la contraseña es correcta

3. **PERFIL DEL USUARIO**
   - Muestra: ID, Nombre, Correo, Fecha de Registro
   - Permite editar: Nombre visible, Rol/Cargo, Descripción
   - Permite cambiar: Foto de perfil
   - Opción de cerrar sesión

---

## 📁 Archivos Creados/Modificados

### 🆕 NUEVOS ARCHIVOS:

1. **`htmls/javascript/usuarios.js`** - Sistema de gestión de usuarios
   - Clase `GestorUsuarios` con métodos para:
     - Registro de usuarios
     - Login
     - Obtener usuario logueado
     - Actualizar perfil
     - Cambiar foto
     - Cerrar sesión

2. **`prueba-usuarios.html`** - Página de prueba del sistema
   - Instrucciones de cómo usar el sistema
   - Botones para ver usuarios registrados
   - Opción para limpiar datos (solo para pruebas)

### ✏️ ARCHIVOS MODIFICADOS:

1. **`htmls/login.html`**
   - Ahora tiene campos para: Email, Nombre (registro), Contraseña
   - Botón para alternar entre "Iniciar Sesión" y "Crear Cuenta"
   - Mensajes de error/éxito

2. **`htmls/javascript/login.js`**
   - Lógica para registro y login
   - Validación de datos
   - Uso del gestor de usuarios

3. **`htmls/perfil.html`**
   - Agregar sección para mostrar ID, Correo, Fecha de Creación
   - Estilos mejorados para la información del usuario

4. **`htmls/javascript/perfil.js`**
   - Actualizado para usar el nuevo gestor de usuarios
   - Muestra todos los datos: ID, Correo, Fecha de Creación
   - Edición de perfil mejorada

---

## 🚀 Cómo Usar el Sistema

### Paso 1: REGISTRO (Crear Cuenta)
```
1. Abre htmls/login.html
2. Haz clic en "Crear una" (abajo a la derecha)
3. Llena los campos:
   - Nombre: Tu nombre completo
   - Correo: Tu email único
   - Contraseña: Mínimo 6 caracteres
   - Confirmar contraseña: Repite la contraseña
4. Haz clic en "REGISTRAR"
5. Se generará automáticamente un ID de 4 dígitos
6. Serás redirigido al perfil
```

### Paso 2: LOGIN (Iniciar Sesión)
```
1. Abre htmls/login.html
2. Asegúrate que estés en modo "Iniciar Sesión"
3. Ingresa:
   - Correo: El email que usaste al registrarte
   - Contraseña: La contraseña que creaste
4. Haz clic en "ENTRAR"
5. Si todo es correcto, irás al perfil
```

### Paso 3: PERFIL
```
1. Verás tu información:
   - ID de 4 dígitos (generado al registro)
   - Correo (el que registraste)
   - Fecha de creación (automática)
   - Nombre, Rol, Descripción (editables)

2. Puedes:
   - Cambiar foto de perfil
   - Editar nombre visible
   - Cambiar rol/cargo
   - Escribir descripción
   - Guardar cambios
   - Cerrar sesión
```

---

## 💾 Almacenamiento de Datos

Los datos se guardan en **localStorage** con esta estructura:

```json
{
  "correo@ejemplo.com": {
    "username": "correo@ejemplo.com",
    "nombre": "Omar Vilchez",
    "email": "correo@ejemplo.com",
    "contraseña": "micontraseña123",
    "id": "7523",
    "fechaCreacion": "28/05/2026",
    "displayName": "Omar Vilchez",
    "role": "Usuario",
    "bio": "Mi descripción",
    "photo": "datos-de-imagen-base64..."
  }
}
```

---

## 🔐 Información de Seguridad

⚠️ **IMPORTANTE PARA PRODUCCIÓN:**
- Las contraseñas se guardan en texto plano en localStorage
- Para un sistema real, debes:
  1. Usar un servidor backend
  2. Hashear las contraseñas (bcrypt, SHA256, etc.)
  3. Usar HTTPS
  4. Implementar JWT o cookies seguras
  5. Validar datos en el servidor

---

## ✅ Checklist de Funcionalidades

- [x] Crear cuenta con Nombre, Correo, Contraseña
- [x] Generar ID único de 4 dígitos
- [x] Registrar fecha de creación automáticamente
- [x] Mostrar ID en el perfil
- [x] Mostrar Correo en el perfil
- [x] Mostrar Fecha de Creación en el perfil
- [x] Mostrar Nombre en el perfil (desde el registro)
- [x] Login con validación de credenciales
- [x] Editar nombre visible del perfil
- [x] Cambiar foto de perfil
- [x] Cerrar sesión
- [x] Almacenamiento persistente en localStorage

---

## 🧪 Probar el Sistema

1. Abre **`prueba-usuarios.html`** (en la raíz del proyecto)
2. Haz clic en "Ir a Login"
3. Sigue los pasos de registro
4. Verifica que todo funciona correctamente

---

## 📞 Soporte

Si encuentras problemas:
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que los emails sean únicos
4. Comprueba que las contraseñas tengan mínimo 6 caracteres
5. Limpia los datos con el botón "Limpiar Todo" en prueba-usuarios.html

---

**¡Tu sistema está listo! 🎉**
