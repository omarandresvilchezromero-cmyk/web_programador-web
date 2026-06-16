/**
 * TEST DEBUG - Inspeccionar respuestas exactas del servidor
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

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

async function inspectApi() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('DEBUG - INSPECCIONAR RESPUESTAS DEL SERVIDOR');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let adminCookie = '';
  let userCookie = '';

  try {
    // Login admin
    console.log('1. Login Admin\n');
    const adminLoginRes = await makeRequest('POST', '/api/login', {
      correoUsuario: 'admin@test.com',
      contrasenia: 'admin123456'
    });
    console.log(`Status: ${adminLoginRes.status}`);
    console.log(`Body: ${JSON.stringify(adminLoginRes.body, null, 2)}\n`);
    
    if (adminLoginRes.headers['set-cookie']) {
      adminCookie = adminLoginRes.headers['set-cookie'][0].split(';')[0];
    }

    // Register user
    console.log('2. Registrar usuario\n');
    const registerRes = await makeRequest('POST', '/api/register', {
      nombre_usuario: `testuser${Date.now()}`,
      correoUsuario: `testuser${Date.now()}@test.com`,
      contrasenia: 'password123'
    });
    console.log(`Status: ${registerRes.status}`);
    console.log(`Body: ${JSON.stringify(registerRes.body, null, 2)}\n`);

    // Login user
    console.log('3. Login usuario\n');
    const userLoginRes = await makeRequest('POST', '/api/login', {
      correoUsuario: registerRes.body.user.correoUsuario,
      contrasenia: 'password123'
    });
    console.log(`Status: ${userLoginRes.status}`);
    console.log(`Body: ${JSON.stringify(userLoginRes.body, null, 2)}\n`);
    
    if (userLoginRes.headers['set-cookie']) {
      userCookie = userLoginRes.headers['set-cookie'][0].split(';')[0];
    }

    // Create solicitud
    console.log('4. Crear solicitud\n');
    const crearRes = await makeRequest('POST', '/api/solicitudes', {
      especialidad: 'desarrollo-web',
      experiencia: '2 años',
      descripcion: 'Test'
    }, userCookie);
    console.log(`Status: ${crearRes.status}`);
    console.log(`Body: ${JSON.stringify(crearRes.body, null, 2)}\n`);

    const solicitudId = crearRes.body.id || crearRes.body.solicitud?.id;

    // Get admin solicitudes
    console.log('5. GET /api/admin/solicitudes\n');
    const getSolRes = await makeRequest('GET', '/api/admin/solicitudes', null, adminCookie);
    console.log(`Status: ${getSolRes.status}`);
    console.log(`Body (primero 200 chars): ${JSON.stringify(getSolRes.body).substring(0, 200)}...\n`);

    if (solicitudId) {
      // Get single solicitud
      console.log(`6. GET /api/admin/solicitudes/${solicitudId}\n`);
      const getSingleRes = await makeRequest('GET', `/api/admin/solicitudes/${solicitudId}`, null, adminCookie);
      console.log(`Status: ${getSingleRes.status}`);
      console.log(`Body: ${JSON.stringify(getSingleRes.body, null, 2)}\n`);

      // Approve
      console.log(`7. PUT /api/admin/solicitudes/${solicitudId} (approve)\n`);
      const approveRes = await makeRequest('PUT', `/api/admin/solicitudes/${solicitudId}`, {
        action: 'approve',
        insignia: 'empleado-verificado'
      }, adminCookie);
      console.log(`Status: ${approveRes.status}`);
      console.log(`Body: ${JSON.stringify(approveRes.body, null, 2)}\n`);
    }

    // Get profile
    console.log('8. GET /api/profile\n');
    const profileRes = await makeRequest('GET', '/api/profile', null, userCookie);
    console.log(`Status: ${profileRes.status}`);
    console.log(`Body: ${JSON.stringify(profileRes.body, null, 2)}\n`);

    // Get notificaciones
    console.log('9. GET /api/notificaciones\n');
    const notifRes = await makeRequest('GET', '/api/notificaciones', null, userCookie);
    console.log(`Status: ${notifRes.status}`);
    console.log(`Body: ${JSON.stringify(notifRes.body, null, 2)}\n`);

    // Get mensajes
    console.log('10. GET /api/mensajes\n');
    const mensajesRes = await makeRequest('GET', '/api/mensajes', null, userCookie);
    console.log(`Status: ${mensajesRes.status}`);
    console.log(`Body: ${JSON.stringify(mensajesRes.body, null, 2)}\n`);

    // Get servicios
    console.log('11. GET /api/servicios\n');
    const serviciosRes = await makeRequest('GET', '/api/servicios', null, adminCookie);
    console.log(`Status: ${serviciosRes.status}`);
    console.log(`Body: ${JSON.stringify(serviciosRes.body, null, 2)}\n`);

  } catch (err) {
    console.error('Error:', err);
  }
}

inspectApi();
