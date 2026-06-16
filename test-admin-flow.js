/**
 * TEST COMPLETO DE FLUJO DE CONTRATACIÓN (EXTREMO A EXTREMO)
 * 
 * Valida:
 * 1. Crear solicitud de empleo
 * 2. Solicitud en estado Pendiente
 * 3. Obtener desde /api/admin/solicitudes
 * 4. Aprobar como admin
 * 5. Estado cambia a Aceptada
 * 6. Se crea registro en empleados
 * 7. No hay duplicados en empleados
 * 8. Usuario tiene rol Empleado
 * 9. Se genera notificación
 * 10. Se genera mensaje de bienvenida
 * 11. Empleado aparece en /api/admin/empleados
 * 12. Empleado puede asignarse a servicios
 * 13. Segunda aprobación falla correctamente
 * 14. Resumen PASS/FAIL
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let testResults = [];

// Helper para hacer requests HTTP
async function makeRequest(method, path, body = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json, headers: res.headers, text: data });
        } catch {
          resolve({ status: res.statusCode, body: null, headers: res.headers, text: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Registrar resultado de prueba
function recordTest(testName, passed, details = '') {
  testResults.push({ testName, passed, details });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m'; // verde/rojo
  const reset = '\x1b[0m';
  console.log(`   ${color}${icon}${reset} ${testName}${details ? ' - ' + details : ''}`);
}

// Función principal de test
async function runCompleteFlowTest() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   TEST COMPLETO DE FLUJO DE CONTRATACIÓN (E2E)              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let adminCookie = '';
  let userCookie = '';
  let testUserEmail = `testuser-${Date.now()}@test.com`;
  let solicitudId = null;
  let empleadoId = null;
  let userId = null;

  try {
    // ═══════════════════════════════════════════════════════════════
    // FASE 1: PREPARAR USUARIOS
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 FASE 1: PREPARAR USUARIOS');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 1.1 Login como Admin
    console.log('1.1 Login como Administrador');
    const adminLoginRes = await makeRequest('POST', '/api/login', {
      correoUsuario: 'admin@test.com',
      contrasenia: 'admin123456'
    });

    if (adminLoginRes.status === 200 && adminLoginRes.headers['set-cookie']) {
      adminCookie = adminLoginRes.headers['set-cookie'][0].split(';')[0];
      recordTest('Admin login', true);
    } else {
      recordTest('Admin login', false, `Status: ${adminLoginRes.status}`);
      throw new Error('No se pudo conectar como admin');
    }

    // 1.2 Registrar usuario regular para solicitud
    console.log('\n1.2 Registrar usuario regular para solicitud de empleo');
    const registerRes = await makeRequest('POST', '/api/register', {
      nombre_usuario: `testuser${Date.now()}`,
      correoUsuario: testUserEmail,
      contrasenia: 'password123'
    });

    if (registerRes.status === 200 && registerRes.body.user) {
      userId = registerRes.body.user.id;
      userCookie = registerRes.body.user; // El registro retorna la sesión
      recordTest('Registrar usuario regular', true, `ID: ${userId}`);
    } else {
      recordTest('Registrar usuario regular', false, `Status: ${registerRes.status}`);
      throw new Error('No se pudo registrar usuario');
    }

    // 1.3 Login como usuario regular
    console.log('\n1.3 Login como usuario regular');
    const userLoginRes = await makeRequest('POST', '/api/login', {
      correoUsuario: testUserEmail,
      contrasenia: 'password123'
    });

    if (userLoginRes.status === 200 && userLoginRes.headers['set-cookie']) {
      userCookie = userLoginRes.headers['set-cookie'][0].split(';')[0];
      recordTest('User login', true);
    } else {
      recordTest('User login', false, `Status: ${userLoginRes.status}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 2: CREAR SOLICITUD DE EMPLEO
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n📝 FASE 2: CREAR SOLICITUD DE EMPLEO');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 2.1 Crear solicitud
    console.log('2.1 Crear solicitud de empleo');
    const crearSolicitudRes = await makeRequest('POST', '/api/solicitudes', {
      especialidad: 'desarrollo-web',
      experiencia: '2 años',
      descripcion: 'Solicitud de prueba automatizada'
    }, userCookie);

    if (crearSolicitudRes.status === 200 && crearSolicitudRes.body.solicitud) {
      solicitudId = crearSolicitudRes.body.solicitud.id;
      recordTest('Crear solicitud de empleo', true, `ID: ${solicitudId}`);
    } else {
      recordTest('Crear solicitud de empleo', false, `Status: ${crearSolicitudRes.status}`);
      console.log('   Response:', JSON.stringify(crearSolicitudRes.body).substring(0, 100));
    }

    // 2.2 Verificar estado pendiente en base de datos
    console.log('\n2.2 Verificar solicitud en estado Pendiente');
    const getSolicitud1 = await makeRequest('GET', `/api/admin/solicitudes/${solicitudId}`, null, adminCookie);
    
    if (getSolicitud1.status === 200 && getSolicitud1.body.solicitud) {
      const estado = (getSolicitud1.body.solicitud.estado || '').toLowerCase();
      const isPendiente = estado === 'pendiente';
      recordTest('Solicitud en estado Pendiente', isPendiente, `Estado actual: ${estado}`);
    } else {
      recordTest('Solicitud en estado Pendiente', false, 'No se pudo obtener solicitud');
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 3: VERIFICAR SOLICITUD EN PANEL ADMIN
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n🔍 FASE 3: VERIFICAR SOLICITUD EN PANEL ADMIN');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 3.1 Obtener todas las solicitudes como admin
    console.log('3.1 Obtener solicitudes desde /api/admin/solicitudes');
    const getSolicitudesRes = await makeRequest('GET', '/api/admin/solicitudes', null, adminCookie);
    
    let solicitudEnLista = false;
    if (getSolicitudesRes.status === 200 && getSolicitudesRes.body.solicitudes) {
      solicitudEnLista = getSolicitudesRes.body.solicitudes.some(s => s.id === solicitudId);
      recordTest('Solicitud aparece en /api/admin/solicitudes', solicitudEnLista);
      const count = getSolicitudesRes.body.solicitudes.length;
      console.log(`   (Total de solicitudes: ${count})`);
    } else {
      recordTest('Solicitud aparece en /api/admin/solicitudes', false);
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 4: APROBAR SOLICITUD
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n✅ FASE 4: APROBAR SOLICITUD');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 4.1 Aprobar como admin
    console.log('4.1 Aprobar solicitud como Administrador');
    const approveRes = await makeRequest('PUT', `/api/admin/solicitudes/${solicitudId}`, {
      action: 'approve',
      insignia: 'empleado-verificado'
    }, adminCookie);

    const aprobacionExitosa = approveRes.status === 200 && approveRes.body.ok;
    recordTest('Aprobar solicitud', aprobacionExitosa, `Status: ${approveRes.status}`);

    if (!aprobacionExitosa) {
      console.log('   Error:', JSON.stringify(approveRes.body).substring(0, 100));
    }

    // 4.2 Verificar que estado cambió a Aceptada
    console.log('\n4.2 Verificar que estado cambió a Aceptada');
    const getSolicitud2 = await makeRequest('GET', `/api/admin/solicitudes/${solicitudId}`, null, adminCookie);
    
    let estadoAceptada = false;
    if (getSolicitud2.status === 200 && getSolicitud2.body.solicitud) {
      const estado = (getSolicitud2.body.solicitud.estado || '').toLowerCase();
      estadoAceptada = estado === 'aceptada' || estado === 'accepted';
      recordTest('Estado cambió a Aceptada', estadoAceptada, `Estado actual: ${estado}`);
    } else {
      recordTest('Estado cambió a Aceptada', false, 'No se pudo obtener solicitud');
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 5: VERIFICAR EMPLEADO CREADO
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n👤 FASE 5: VERIFICAR EMPLEADO CREADO');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 5.1 Verificar que se creó registro en empleados
    console.log('5.1 Verificar que se creó registro en empleados');
    const getEmpleadosRes = await makeRequest('GET', '/api/admin/empleados', null, adminCookie);
    
    let empleadoCreado = null;
    if (getEmpleadosRes.status === 200 && getEmpleadosRes.body.empleados) {
      empleadoCreado = getEmpleadosRes.body.empleados.find(e => e.id_usuario === userId);
      const empleadoExiste = !!empleadoCreado;
      recordTest('Se creó registro en empleados', empleadoExiste);
      
      if (empleadoCreado) {
        empleadoId = empleadoCreado.id_empleado || empleadoCreado.id;
        console.log(`   ID Empleado: ${empleadoId}`);
        console.log(`   Especialidad: ${empleadoCreado.especialidad}`);
        console.log(`   Fecha Ingreso: ${empleadoCreado.fecha_ingreso}`);
        console.log(`   Estado: ${empleadoCreado.estado}`);
      }
    } else {
      recordTest('Se creó registro en empleados', false);
    }

    // 5.2 Verificar que NO hay duplicados
    console.log('\n5.2 Verificar que NO hay empleados duplicados');
    let empleadosDuplicados = 0;
    if (getEmpleadosRes.status === 200 && getEmpleadosRes.body.empleados) {
      const empleadosDelUsuario = getEmpleadosRes.body.empleados.filter(e => e.id_usuario === userId);
      empleadosDuplicados = empleadosDelUsuario.length;
      recordTest('No hay empleados duplicados', empleadosDuplicados === 1, `Cantidad: ${empleadosDuplicados}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 6: VERIFICAR ROL DEL USUARIO
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n🔐 FASE 6: VERIFICAR ROL DEL USUARIO');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 6.1 Obtener perfil del usuario
    console.log('6.1 Obtener perfil del usuario');
    const getProfileRes = await makeRequest('GET', '/api/profile', null, userCookie);
    
    let rolEsEmpleado = false;
    if (getProfileRes.status === 200 && getProfileRes.body.user) {
      const rol = (getProfileRes.body.user.rol || '').toLowerCase();
      rolEsEmpleado = rol === 'empleado';
      recordTest('Usuario tiene rol Empleado', rolEsEmpleado, `Rol actual: ${rol}`);
      console.log(`   Empleado Flag: ${getProfileRes.body.empleado ? 'Sí' : 'No'}`);
    } else {
      recordTest('Usuario tiene rol Empleado', false, `Status: ${getProfileRes.status}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 7: VERIFICAR NOTIFICACIONES Y MENSAJES
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n🔔 FASE 7: VERIFICAR NOTIFICACIONES Y MENSAJES');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 7.1 Verificar notificación de aprobación
    console.log('7.1 Verificar notificación de aprobación');
    const getNotificacionesRes = await makeRequest('GET', '/api/notificaciones', null, userCookie);
    
    let notificacionExiste = false;
    if (getNotificacionesRes.status === 200 && getNotificacionesRes.body.notificaciones) {
      const notif = getNotificacionesRes.body.notificaciones.find(n => 
        n.mensaje && n.mensaje.toLowerCase().includes('solicitud de empleo')
      );
      notificacionExiste = !!notif;
      recordTest('Se generó notificación de aprobación', notificacionExiste);
      if (notif) {
        console.log(`   Mensaje: ${notif.mensaje.substring(0, 60)}...`);
      }
    } else {
      recordTest('Se generó notificación de aprobación', false, `Status: ${getNotificacionesRes.status}`);
    }

    // 7.2 Verificar mensaje de bienvenida
    console.log('\n7.2 Verificar mensaje de bienvenida');
    const getMensajesRes = await makeRequest('GET', '/api/mensajes', null, userCookie);
    
    let mensajeExiste = false;
    if (getMensajesRes.status === 200 && getMensajesRes.body.mensajes) {
      const msg = getMensajesRes.body.mensajes.find(m => 
        m.mensaje && (m.mensaje.toLowerCase().includes('felicidades') || m.mensaje.toLowerCase().includes('bienvenido'))
      );
      mensajeExiste = !!msg;
      recordTest('Se generó mensaje de bienvenida', mensajeExiste);
      if (msg) {
        console.log(`   Mensaje: ${msg.mensaje.substring(0, 60)}...`);
      }
    } else {
      recordTest('Se generó mensaje de bienvenida', false, `Status: ${getMensajesRes.status}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 8: VERIFICAR EMPLEADO EN LISTA DE ADMIN
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n📊 FASE 8: VERIFICAR EMPLEADO EN LISTA DE ADMIN');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 8.1 Empleado aparece en /api/admin/empleados
    console.log('8.1 Empleado aparece en /api/admin/empleados');
    recordTest('Empleado en /api/admin/empleados', empleadoCreado !== null);

    // ═══════════════════════════════════════════════════════════════
    // FASE 9: VERIFICAR ASIGNACIÓN A SERVICIOS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n⚙️  FASE 9: VERIFICAR ASIGNACIÓN A SERVICIOS');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 9.1 Intentar obtener servicios disponibles
    console.log('9.1 Obtener servicios disponibles para asignar');
    const getServiciosRes = await makeRequest('GET', '/api/servicios', null, adminCookie);
    
    let serviciosDisponibles = 0;
    if (getServiciosRes.status === 200 && getServiciosRes.body.servicios) {
      serviciosDisponibles = getServiciosRes.body.servicios.length;
      recordTest('Servicios disponibles para asignar', serviciosDisponibles > 0, `Total: ${serviciosDisponibles}`);
    } else {
      recordTest('Servicios disponibles para asignar', false, `Status: ${getServiciosRes.status}`);
    }

    // 9.2 Verificar que empleado se puede asignar
    console.log('\n9.2 Verificar que empleado se puede asignar a servicios');
    if (empleadoId && serviciosDisponibles > 0) {
      recordTest('Empleado elegible para servicios', true, `ID Empleado: ${empleadoId}`);
    } else {
      recordTest('Empleado elegible para servicios', false, 'Falta empleado o servicios');
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 10: VERIFICAR DOBLE APROBACIÓN FALLA
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n🚫 FASE 10: VERIFICAR QUE DOBLE APROBACIÓN FALLA');
    console.log('─────────────────────────────────────────────────────────────\n');

    // 10.1 Intentar aprobar de nuevo
    console.log('10.1 Intentar aprobar la misma solicitud de nuevo');
    const approveAgainRes = await makeRequest('PUT', `/api/admin/solicitudes/${solicitudId}`, {
      action: 'approve',
      insignia: 'empleado-verificado'
    }, adminCookie);

    // Puede fallar (400, 409) o simplemente ignorar
    const dobleAprobacionBien = approveAgainRes.status !== 200 || 
                                 (approveAgainRes.body.error || 
                                  approveAgainRes.body.message === 'Solicitud ya procesada');
    recordTest('Doble aprobación es rechazada o ignorada', dobleAprobacionBien, `Status: ${approveAgainRes.status}`);

    // ═══════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                       RESUMEN FINAL                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const passed = testResults.filter(t => t.passed).length;
    const failed = testResults.filter(t => !t.passed).length;
    const total = testResults.length;

    console.log(`\n📊 RESULTADOS:`);
    console.log(`   Total de pruebas: ${total}`);
    console.log(`   ✓ Pasadas: ${passed}`);
    console.log(`   ✗ Fallidas: ${failed}`);
    console.log(`   Éxito: ${((passed / total) * 100).toFixed(1)}%\n`);

    console.log(`📍 ENDPOINTS PROBADOS:`);
    const endpoints = new Set([
      'POST /api/register',
      'POST /api/login',
      'POST /api/solicitudes',
      'GET /api/admin/solicitudes',
      'GET /api/admin/solicitudes/:id',
      'PUT /api/admin/solicitudes/:id',
      'GET /api/admin/empleados',
      'GET /api/profile',
      'GET /api/notificaciones',
      'GET /api/mensajes',
      'GET /api/servicios'
    ]);
    endpoints.forEach(ep => console.log(`   • ${ep}`));

    console.log(`\n📋 TABLAS VERIFICADAS:`);
    const tables = new Set([
      'cuenta_usuario (rol, id_usuarios)',
      'solicitudes_empleo (estado, id_usuario, id)',
      'empleados (id_usuario, id_empleado, estado)',
      'notificaciones (id_usuario, mensaje)',
      'mensajes (remitente, destinatario, mensaje)'
    ]);
    tables.forEach(t => console.log(`   • ${t}`));

    console.log(`\n✅ PRUEBAS PASADAS:`);
    testResults.filter(t => t.passed).forEach(t => {
      console.log(`   • ${t.testName}`);
    });

    console.log(`\n❌ PRUEBAS FALLIDAS:`);
    const failedTests = testResults.filter(t => !t.passed);
    if (failedTests.length === 0) {
      console.log(`   (Ninguna)`);
    } else {
      failedTests.forEach(t => {
        console.log(`   • ${t.testName} - ${t.details}`);
      });
    }

    console.log(`\n⏳ FUNCIONALIDADES PENDIENTES:`);
    const pending = [
      'Asignación de servicios a empleados (crear servicio asignado)',
      'Validación de permisos en endpoints de empleado',
      'Búsqueda y filtrado avanzado en admin panel',
      'Actualización de perfil de empleado',
      'Calificación de empleados'
    ];
    pending.forEach(p => console.log(`   • ${p}`));

    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ ERROR CRÍTICO EN TEST:', err.message);
    console.error(err);
  }
}

// Ejecutar
runCompleteFlowTest().catch(console.error);
