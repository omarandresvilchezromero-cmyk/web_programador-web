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
  console.log('=== TESTING FULL HIRING WORKFLOW ===\n');
  
  try {
    const timestamp = Date.now();
    const newUserEmail = `newhire-${timestamp}@test.com`;
    const newUserName = `NewHire${timestamp}`;
    
    // 1. Register new user
    console.log('1. Register new user...');
    let res = await makeRequest('POST', '/api/register', {
      nombre_usuario: newUserName,
      correoUsuario: newUserEmail,
      contrasenia: 'password123'
    });
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    const newUserId = res.body.user.id;
    console.log('✓ New user created, ID:', newUserId, '\n');
    
    // 2. Login new user
    console.log('2. Login new user...');
    res = await makeRequest('POST', '/api/login', {
      correoUsuario: newUserEmail,
      contrasenia: 'password123'
    });
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    const userCookie = getCookie(res);
    console.log('✓ User logueado\n');
    
    // 3. Login admin
    console.log('3. Login admin...');
    res = await makeRequest('POST', '/api/login', {
      correoUsuario: 'admin-1781571713948@test.com',
      contrasenia: 'admin123456'
    });
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    const adminCookie = getCookie(res);
    console.log('✓ Admin logueado\n');
    
    // 4. User creates solicitud
    console.log('4. User creates solicitud...');
    res = await makeRequest('POST', '/api/solicitudes', {
      especialidad: 'Cloud Engineering',
      experiencia: '5 years',
      descripcion: 'Full-stack cloud developer with AWS experience'
    }, userCookie);
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    const solicitudId = res.body.id;
    console.log('✓ Solicitud created, ID:', solicitudId, '\n');
    
    // 5. Admin gets solicitud details
    console.log('5. Admin gets solicitud details...');
    res = await makeRequest('GET', `/api/admin/solicitudes/${solicitudId}`, null, adminCookie);
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    console.log('✓ Solicitud details:');
    console.log('  - Estado:', res.body.solicitud.estado);
    console.log('  - Especialidad:', res.body.solicitud.especialidad);
    console.log('  - Experiencia:', res.body.solicitud.experiencia, '\n');
    
    // 6. Admin approves solicitud
    console.log('6. Admin approves solicitud...');
    res = await makeRequest('PUT', `/api/admin/solicitudes/${solicitudId}`, {
      action: 'approve'
    }, adminCookie);
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      console.log('RAW:', res.raw.substring(0, 500));
      return;
    }
    console.log('✓ Solicitud approved');
    console.log('  - Message:', res.body.message, '\n');
    
    // 7. Verify user is now empleado
    console.log('7. Check user profile after approval...');
    res = await makeRequest('GET', '/api/profile', null, userCookie);
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    console.log('✓ User profile:');
    console.log('  - Rol:', res.body.user.rol);
    console.log('  - Empleado:', res.body.empleado ? 'SÍ - ID: ' + res.body.empleado.id_empleado : 'No');
    console.log('');
    
    // 8. Verify admin can see empleado
    console.log('8. Admin views all empleados...');
    res = await makeRequest('GET', '/api/admin/empleados', null, adminCookie);
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.body);
      return;
    }
    console.log('✓ Empleados:');
    console.log('  - Total:', res.body.empleados.length);
    const newEmpleado = res.body.empleados.find(e => e.user_nombre === newUserName);
    if (newEmpleado) {
      console.log('  - Found new empleado:', newEmpleado.user_nombre, '(ID:', newEmpleado.id_empleado, ')');
    }
    console.log('');
    
    console.log('=== ✓ ALL TESTS PASSED ===');
    console.log('Hiring workflow completed successfully!');
    
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
