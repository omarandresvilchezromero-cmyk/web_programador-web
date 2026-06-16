const http = require('http');

function makeRequest(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({ status: res.statusCode, body: parsed, raw: responseData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, raw: responseData, headers: res.headers, error: e.message });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function getCookie(res) {
  const setCookie = res.headers ? res.headers['set-cookie'] : null;
  if (!Array.isArray(setCookie)) return '';
  return setCookie.map(c => c.split(';')[0]).join('; ');
}

async function test() {
  console.log('=== TESTING ENDPOINTS CON ADMIN CORRECTO ===\n');
  
  try {
    const adminEmail = 'admin-1781571713948@test.com';
    const adminPass = 'admin123456';
    const userEmail = 'user-1781571714133@test.com';
    const userPass = 'user123456';
    
    // 1. Login admin
    console.log('1. Login admin...');
    let res = await makeRequest('POST', '/api/login', {
      correoUsuario: adminEmail,
      contrasenia: adminPass
    });
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    const adminCookie = getCookie(res);
    console.log('✓ Admin logueado\n');
    
    // 2. Login user
    console.log('2. Login user...');
    res = await makeRequest('POST', '/api/login', {
      correoUsuario: userEmail,
      contrasenia: userPass
    });
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    const userCookie = getCookie(res);
    console.log('✓ User logueado\n');
    
    // 3. GET /api/admin/solicitudes
    console.log('3. GET /api/admin/solicitudes...');
    res = await makeRequest('GET', '/api/admin/solicitudes', null, adminCookie);
    console.log('Status:', res.status);
    console.log('Count:', res.body.solicitudes ? res.body.solicitudes.length : 0);
    if (res.status === 200) {
      console.log('✓ OK - Solicitudes obtenidas');
      res.body.solicitudes.forEach(s => {
        console.log(`  - ID ${s.id}: ${s.nombre_usuario} - ${s.estado}`);
      });
    } else {
      console.log('ERROR:', res.body);
    }
    console.log('');
    
    // 4. GET /api/admin/empleados
    console.log('4. GET /api/admin/empleados...');
    res = await makeRequest('GET', '/api/admin/empleados', null, adminCookie);
    console.log('Status:', res.status);
    console.log('Count:', res.body.empleados ? res.body.empleados.length : 0);
    if (res.status === 200) {
      console.log('✓ OK - Empleados obtenidos');
      res.body.empleados.forEach(e => {
        console.log(`  - ID ${e.id_empleado}: ${e.user_nombre}`);
      });
    } else {
      console.log('ERROR:', res.body);
    }
    console.log('');
    
    // 5. GET /api/profile (user)
    console.log('5. GET /api/profile (user)...');
    res = await makeRequest('GET', '/api/profile', null, userCookie);
    console.log('Status:', res.status);
    if (res.status === 200) {
      console.log('✓ OK');
      console.log('  User:', res.body.user.nombre_usuario);
      console.log('  Empleado:', res.body.empleado ? 'Sí' : 'No');
    } else {
      console.log('ERROR:', res.body);
    }
    console.log('');
    
    // 6. CREATE SOLICITUD
    console.log('6. Create solicitud (user)...');
    res = await makeRequest('POST', '/api/solicitudes', {
      especialidad: 'Cloud',
      experiencia: '3 years',
      descripcion: 'Solicitud para testing E2E'
    }, userCookie);
    console.log('Status:', res.status);
    if (res.status === 200) {
      const solicitudId = res.body.id;
      console.log('✓ OK - ID:', solicitudId);
      
      // 7. GET /api/admin/solicitudes/:id
      console.log('\n7. GET /api/admin/solicitudes/' + solicitudId + '...');
      res = await makeRequest('GET', '/api/admin/solicitudes/' + solicitudId, null, adminCookie);
      console.log('Status:', res.status);
      if (res.status === 200) {
        console.log('✓ OK');
        console.log('  Solicitud estado:', res.body.solicitud.estado);
      } else {
        console.log('ERROR:', res.body);
      }
      
      // 8. APPROVE SOLICITUD
      console.log('\n8. PUT /api/admin/solicitudes/' + solicitudId + ' (approve)...');
      res = await makeRequest('PUT', '/api/admin/solicitudes/' + solicitudId, {
        action: 'approve'
      }, adminCookie);
      console.log('Status:', res.status);
      if (res.status === 200) {
        console.log('✓ OK - Solicitud aprobada');
        console.log('  Mensaje:', res.body.message);
      } else {
        console.log('ERROR:', res.body);
        console.log('RAW:', res.raw.substring(0, 300));
      }
    } else {
      console.log('ERROR:', res.body);
    }
    
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
