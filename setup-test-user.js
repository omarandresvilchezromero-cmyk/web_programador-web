const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function setupTestUser() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'omar',
    password: '040705',
    database: 'web_programacion'
  });

  try {
    const testEmail = 'debugging@test.com';
    const testPassword = 'test123456';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    console.log('=== CONFIGURANDO USUARIO DE PRUEBA ===');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('Hash:', hashedPassword);

    // Delete existing test user
    await pool.query('DELETE FROM cuenta_usuario WHERE correoUsuario = ?', [testEmail]);
    console.log('✓ Usuario anterior eliminado');

    // Insert new test user
    const [result] = await pool.query(
      'INSERT INTO cuenta_usuario (nombre_usuario, correoUsuario, contrasenia, rol) VALUES (?, ?, ?, ?)',
      ['testdebug', testEmail, hashedPassword, 'Usuario']
    );
    console.log('✓ Usuario creado. ID:', result.insertId);

    // Verify user exists
    const [users] = await pool.query('SELECT * FROM cuenta_usuario WHERE correoUsuario = ?', [testEmail]);
    console.log('✓ Usuario verificado:', JSON.stringify(users[0], null, 2));

    // Test login
    console.log('\n=== TESTANDO LOGIN ===');
    const loginResp = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        correoUsuario: testEmail, 
        contrasenia: testPassword
      }),
      credentials: 'include'
    });
    const loginData = await loginResp.json();
    console.log('Status:', loginResp.status);
    console.log('Response:', JSON.stringify(loginData, null, 2));
    console.log('Set-Cookie:', loginResp.headers.get('set-cookie'));

    if (loginResp.status === 200 && loginData.ok) {
      console.log('\n✓ LOGIN EXITOSO');
      
      // Test profile with cookies
      console.log('\n=== TESTANDO GET /api/profile ===');
      const cookies = loginResp.headers.get('set-cookie');
      const profileResp = await fetch('http://localhost:3000/api/profile', {
        credentials: 'include',
        headers: {
          'Cookie': cookies
        }
      });
      const profileData = await profileResp.json();
      console.log('Status:', profileResp.status);
      console.log('Response:', JSON.stringify(profileData, null, 2));
    }

  } catch (err) {
    console.error('Error:', err.message, err.stack);
  } finally {
    await pool.end();
  }
}

setupTestUser();
