// Panel de solicitudes de empleo para administradores
(function(){
  const solicitudesList = document.getElementById('solicitudesList');
  const badgeSolicitudesPendientes = document.getElementById('badgeSolicitudesPendientes');
  const adminSolicitudesPanel = document.getElementById('adminSolicitudesPanel');
  const tabAdmin = document.getElementById('tabAdmin');

  let solicitudes = [];
  let usuarioActual = null;

  async function verificarAdmin() {
    try {
      const res = await fetch('/api/session', { credentials: 'include' });
      const data = await res.json();
      usuarioActual = data.user;
      const esAdmin = usuarioActual && (usuarioActual.rol === 'admin' || usuarioActual.rol === 'Administrador' || usuarioActual.rol === 'administrador');
      
      if (esAdmin && adminSolicitudesPanel) {
        adminSolicitudesPanel.style.display = 'block';
        if (tabAdmin) tabAdmin.style.display = 'block';
        cargarSolicitudes();
        // Refrescar automáticamente cada 5 segundos para mostrar nuevas solicitudes
        setInterval(() => {
          cargarSolicitudes();
        }, 5000);
      }
    } catch (err) {
      console.error('Error verificando sesión admin:', err);
    }
  }

  async function cargarSolicitudes() {
    try {
      const res = await fetch('/api/admin/solicitudes', { credentials: 'include' });
      if (!res.ok) {
        console.error('Error cargando solicitudes:', res.status);
        return;
      }
      const data = await res.json();
      solicitudes = data.solicitudes || data || [];
      console.log('SOLICITUDES RECIBIDAS:', solicitudes);
      // Actualizar badges y banner visible
      try { if (typeof actualizarBadgesNotificaciones === 'function') actualizarBadgesNotificaciones(); } catch(e){}
      mostrarBannerSolicitudes();
      renderizarSolicitudes();
      actualizarBadge();
    } catch (err) {
      console.error('Error al cargar solicitudes:', err);
    }
  }

  function mostrarBannerSolicitudes() {
    if (!adminSolicitudesPanel) return;
    const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
    let banner = document.getElementById('nuevasSolicitudesBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'nuevasSolicitudesBanner';
      banner.style.cssText = 'background:#0ea5a4;color:#071013;padding:10px;border-radius:8px;margin-bottom:12px;font-weight:700;';
      adminSolicitudesPanel.insertBefore(banner, adminSolicitudesPanel.firstChild);
    }
    if (pendientes > 0) {
      banner.textContent = `Hay ${pendientes} nuevas solicitud(es) pendientes de revisión.`;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }

  function renderizarSolicitudes() {
    if (!solicitudesList) return;
    
    solicitudesList.innerHTML = '';

    if (!solicitudes.length) {
      solicitudesList.innerHTML = '<p style="color: #94a3b8; text-align: center;">No hay solicitudes pendientes</p>';
      return;
    }

    solicitudes.forEach(sol => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #0f172a;
        border-radius: 15px;
        padding: 20px;
        border-left: 4px solid ${getColorEstado(sol.estado)};
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      `;
      
      card.onmouseover = () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 24px rgba(34, 211, 238, 0.1)';
      };
      
      card.onmouseout = () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      };

      const fecha = new Date(sol.fecha_solicitud).toLocaleDateString('es-ES');
      
      card.innerHTML = `
        <div style="display: grid; gap: 15px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">Usuario</p>
              <p style="color: #f8fafc; font-weight: 600; margin: 5px 0 0 0;">${sol.nombre_usuario || 'N/A'}</p>
              <p style="color: #cbd5e1; font-size: 0.9rem; margin: 3px 0 0 0;">${sol.correoUsuario || 'N/A'}</p>
            </div>
            <div>
              <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">Especialidad</p>
              <p style="color: #22d3ee; font-weight: 600; margin: 5px 0 0 0;">${sol.especialidad || 'N/A'}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">Experiencia</p>
              <p style="color: #f8fafc; margin: 5px 0 0 0;">${sol.experiencia || 'N/A'}</p>
            </div>
            <div>
              <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">Fecha Solicitud</p>
              <p style="color: #cbd5e1; margin: 5px 0 0 0;">${fecha}</p>
            </div>
          </div>

          <div>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">Descripción</p>
            <p style="color: #cbd5e1; margin: 5px 0 0 0; line-height: 1.5;">${sol.descripcion || 'Sin descripción'}</p>
          </div>

          <div>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">Estado</p>
            <span style="display: inline-block; background: ${getColorEstado(sol.estado)}22; color: ${getColorEstado(sol.estado)}; padding: 6px 12px; border-radius: 8px; margin-top: 5px; font-weight: 600; text-transform: capitalize;">
              ${sol.estado}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px;">
            ${sol.estado === 'pendiente' ? `
              <button onclick="aprobarSolicitud(${sol.id})" style="background: #10b981; border: none; color: white; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                ✓ Aprobar
              </button>
              <button onclick="abrirDialogoInfo(${sol.id})" style="background: #f59e0b; border: none; color: white; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'">
                ❓ Más Info
              </button>
              <button onclick="abrirDialogoRechazo(${sol.id})" style="background: #ef4444; border: none; color: white; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                ✕ Rechazar
              </button>
            ` : `
              <span style="grid-column: 1/-1; color: #94a3b8; text-align: center; padding: 10px;">
                Esta solicitud ya ha sido ${sol.estado}.
              </span>
            `}
          </div>
        </div>
      `;

      solicitudesList.appendChild(card);
    });
  }

  function getColorEstado(estado) {
    const colores = {
      'pendiente': '#f59e0b',
      'aprobada': '#10b981',
      'rechazada': '#ef4444',
      'info-solicitada': '#3b82f6'
    };
    return colores[estado] || '#94a3b8';
  }

  function actualizarBadge() {
    if (!badgeSolicitudesPendientes) return;
    const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
    badgeSolicitudesPendientes.textContent = pendientes;
    badgeSolicitudesPendientes.style.display = pendientes > 0 ? 'inline-block' : 'none';
  }

  window.aprobarSolicitud = async function(solicitudId) {
    if (!confirm('¿Estás seguro de que deseas aprobar esta solicitud?')) return;

    try {
      const res = await fetch(`/api/admin/solicitudes/${solicitudId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', insignia: 'empleado-verificado' })
      });
      
      if (res.ok) {
        alert('Solicitud aprobada exitosamente');
        cargarSolicitudes();
      } else {
        alert('Error al aprobar la solicitud');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al procesar la solicitud');
    }
  };

  window.abrirDialogoRechazo = function(solicitudId) {
    const razon = prompt('Ingresa la razón del rechazo (opcional):');
    if (razon !== null) {
      rechazarSolicitud(solicitudId, razon);
    }
  };

  async function rechazarSolicitud(solicitudId, razonRechazo) {
    try {
      const res = await fetch(`/api/admin/solicitudes/${solicitudId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', razonRechazo })
      });
      
      if (res.ok) {
        alert('Solicitud rechazada');
        cargarSolicitudes();
      } else {
        alert('Error al rechazar la solicitud');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al procesar la solicitud');
    }
  }

  window.abrirDialogoInfo = function(solicitudId) {
    const pregunta = prompt('Ingresa la información que necesitas:');
    if (pregunta !== null) {
      solicitarInfo(solicitudId, pregunta);
    }
  };

  async function solicitarInfo(solicitudId, pregunta) {
    try {
      const res = await fetch(`/api/admin/solicitudes/${solicitudId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'info-request', pregunta })
      });
      
      if (res.ok) {
        alert('Se solicitó información adicional');
        cargarSolicitudes();
      } else {
        alert('Error al solicitar información');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al procesar la solicitud');
    }
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarAdmin);
  } else {
    verificarAdmin();
  }
})();
