document.addEventListener('DOMContentLoaded', async () => {
  if (window.sessionSyncPromise) await window.sessionSyncPromise;
  const info = document.getElementById('empleadoInfo');
  const serviciosEl = document.getElementById('serviciosAsignados');
  const consultasEl = document.getElementById('consultasPendientes');

  try {
    const resp = await fetch('/api/empleados/me', { credentials: 'include' });
    if (!resp.ok) return info.textContent = 'No eres empleado o sesión inválida.';
    const data = await resp.json();
    const empleado = data.empleado;
    info.innerHTML = `<p><strong>ID Empleado:</strong> ${empleado.id_empleado || empleado.id}</p><p><strong>Especialidad:</strong> ${empleado.especialidad || 'N/A'}</p><p><strong>Estado:</strong> ${empleado.estado || 'N/A'}</p>`;

    // Cargar servicios
    const respServ = await fetch(`/api/empleados/${empleado.id_empleado || empleado.id}/servicios`, { credentials: 'include' });
    if (respServ.ok) {
      const d = await respServ.json();
      serviciosEl.innerHTML = '';
      if (d.servicios && d.servicios.length) {
        d.servicios.forEach(s => {
          const div = document.createElement('div');
          div.style.padding = '10px'; div.style.border = '1px solid #334155'; div.style.marginBottom = '8px';
          div.innerHTML = `<strong>${s.titulo || s.nombre_servicio || 'Servicio'}</strong><div>Estado: ${s.estado || 'N/A'}</div>`;
          serviciosEl.appendChild(div);
        });
      } else {
        serviciosEl.textContent = 'No tienes servicios asignados.';
      }
    }

    // Cargar consultas
    const respCon = await fetch(`/api/empleados/${empleado.id_empleado || empleado.id}/consultas`, { credentials: 'include' });
    if (respCon.ok) {
      const d = await respCon.json();
      consultasEl.innerHTML = '';
      if (d.consultas && d.consultas.length) {
        d.consultas.forEach(c => {
          const div = document.createElement('div');
          div.style.padding = '10px'; div.style.border = '1px solid #334155'; div.style.marginBottom = '8px';
          div.innerHTML = `<strong>${c.asunto || 'Consulta'}</strong><div>Estado: ${c.estado || 'pendiente'}</div><div>Usuario: ${c.id_usuario}</div>`;
          consultasEl.appendChild(div);
        });
      } else {
        consultasEl.textContent = 'No hay consultas asignadas.';
      }
    }

  } catch (e) {
    console.error('Error cargando dashboard de empleado:', e);
    info.textContent = 'Error cargando datos';
  }
});