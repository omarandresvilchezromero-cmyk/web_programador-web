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
  console.log('=== TESTING ENDPOINTS ===\n');
  
  try {
    // 1. Register admin
    console.log('1. Register admin...');
    let res = await makeRequest('POST', '/api/register', {
      nombre_usuario: 'Admin Test',
      correoUsuario: 'admin-' + Date.now() + '@test.com',
      contrasenia: 'admin123456'
    });
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.raw);
      return;
    }
    const adminId = res.body.user.id;
    console.log('Admin ID:', adminId, '\n');
    
    // 2. Register user
    console.log('2. Register user...');
    res = await makeRequest('POST', '/api/register', {
      nombre_usuario: 'User Test',
      correoUsuario: 'user-' + Date.now() + '@test.com',
      contrasenia: 'user123456'
    });
    console.log('Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR:', res.raw);
      return;
    }
    const userId = res.body.user.id;
    const userCookie = getCookie(res);
    console.log('User ID:', userId, '\n');
    
    // 3. Create solicitud
    console.log('3. Create solicitud...');
    res = await makeRequest('POST', '/api/solicitudes', {
      especialidad: 'Backend',
      experiencia: '5 anos',
      descripcion: 'Test'
    }, userCookie);
    console.log('Status:', res.status);
    console.log('Body:', res.body);
    if (res.status !== 200) {
      console.log('ERROR:', res.raw);
      return;
    }
    const solicitudId = res.body.id;
    console.log('Solicitud ID:', solicitudId, '\n');
    
    // 4. Login admin
    console.log('4. Login admin...');
    res = await makeRequest('POST', '/api/login', {
      correoUsuario: 'admin-' + adminId + '@test.com',
      contrasenia: 'admin123456'
    });
    console.log('Status:', res.status);
    console.log('Body:', res.body);
    const adminCookie = getCookie(res);
    console.log('Admin cookie extracted\n');
    
    // 5. GET /api/admin/solicitudes
    console.log('5. GET /api/admin/solicitudes...');
    res = await makeRequest('GET', '/api/admin/solicitudes', null, adminCookie);
    console.log('Status:', res.status);
    console.log('Body:', res.body);
    if (res.status !== 200) {
      console.log('RAW:', res.raw.substring(0, 300));
    }
    console.log('');
    
    // 6. GET /api/profile
    console.log('6. GET /api/profile...');
    res = await makeRequest('GET', '/api/profile', null, userCookie);
    console.log('Status:', res.status);
    console.log('Body:', res.body);
    if (res.status !== 200) {
      console.log('RAW:', res.raw.substring(0, 300));
    }
    console.log('');
    
    // 7. GET /api/admin/empleados
    console.log('7. GET /api/admin/empleados...');
    res = await makeRequest('GET', '/api/admin/empleados', null, adminCookie);
    console.log('Status:', res.status);
    console.log('Body:', res.body);
    if (res.status !== 200) {
      console.log('RAW:', res.raw.substring(0, 300));
    }
    
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();
