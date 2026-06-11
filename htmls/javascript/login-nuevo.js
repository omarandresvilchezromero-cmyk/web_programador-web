/**
 * Sistema de Autenticación Oficial
 * Usa /api/login, /api/register, /api/session, /api/logout
 * Express Sessions + Bcrypt en servidor
 */

console.log('URL ACTUAL:', window.location.href);
console.log('ORIGIN:', window.location.origin);

class SistemaAutenticacionOficial {
  async logResponseDebug(response, label) {
    try {
      const clone = response.clone();
      const text = await clone.text().catch(() => '');
      console.log(`[login-nuevo] ${label} status=${response.status} ok=${response.ok} content-type=${response.headers.get('content-type')} body=`, text);
    } catch (err) {
      console.warn('[login-nuevo] Error al inspeccionar respuesta', err);
    }
  }
  async registrar(nombre_usuario, correoUsuario, contrasenia) {
    try {
      const response = await apiFetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_usuario: nombre_usuario || correoUsuario.split('@')[0],
          correoUsuario,
          contrasenia
        })
      });

      await this.logResponseDebug(response, '/api/register');

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return { exito: false, error: data.error || data.message || 'Error al registrar' };
      }

      setCurrentUser(data.user);
      return { exito: true, usuario: data.user };
    } catch (error) {
      console.error('Error en registro:', error);
      return { exito: false, error: error.message || 'Error de conexión' };
    }
  }

  async login(correoUsuario, contrasenia) {
    try {
      const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correoUsuario,
          contrasenia
        })
      });

      await this.logResponseDebug(response, '/api/login');

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return { exito: false, error: data.error || data.message || 'Credenciales inválidas' };
      }

      setCurrentUser(data.user);
      return { exito: true, usuario: data.user };
    } catch (error) {
      console.error('Error en login:', error);
      return { exito: false, error: error.message || 'Error de conexión' };
    }
  }

  async obtenerSesion() {
    try {
      const data = await getSession();
      return { exito: true, usuario: data.user || null };
    } catch (error) {
      console.error('Error al obtener sesión:', error);
      return { exito: false, error: error.message || 'Error de conexión' };
    }
  }

  async obtenerPerfil() {
    try {
      const data = await getProfile();
      return { exito: true, perfil: data };
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return { exito: false, error: error.message || 'Error de conexión' };
    }
  }

  async logout() {
    return await window.logout();
  }

  async estaSesionActiva() {
    const resultado = await this.obtenerSesion();
    return resultado.usuario !== null;
  }

  obtenerUsuarioLocal() {
    return window.__currentUser || null;
  }
}

// Instancia global
const autenticacion = new SistemaAutenticacionOficial();
