const mysql = require('mysql2/promise');

async function testFlow() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'omar',
    password: '040705',
    database: 'web_programacion'
  });

  try {
    // 1. Check database users
    console.log('\n=== VERIFICANDO USUARIOS EN BD ===');
    const [users] = await pool.query('SELECT id_usuarios, nombre_usuario, correoUsuario, rol FROM cuenta_usuario LIMIT 5');
    console.log('Usuarios encontrados:', JSON.stringify(users, null, 2));

    // 2. Test API calls
    console.log('\n=== TESTANDO API ===');
    
    // Test session endpoint
    console.log('\n1. GET /api/session (sin login)');
    const sessionResp = await fetch('http://localhost:3000/api/session', { 
      credentials: 'include' 
    });
    const sessionData = await sessionResp.json();
    console.log('Status:', sessionResp.status);
    console.log('Body:', JSON.stringify(sessionData, null, 2));
    console.log('Headers:', Object.fromEntries(sessionResp.headers.entries()));

    // Test login with first user if exists
    if (users.length > 0) {
      const user = users[0];
      console.log(`\n2. POST /api/login con usuario ${user.correoUsuario}`);
      
      const loginResp = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          correoUsuario: user.correoUsuario, 
          contrasenia: '123456' // Try default password
        }),
        credentials: 'include'
      });
      const loginData = await loginResp.json();
      console.log('Status:', loginResp.status);
      console.log('Body:', JSON.stringify(loginData, null, 2));
      console.log('Headers Set-Cookie:', loginResp.headers.get('set-cookie'));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

testFlow();
