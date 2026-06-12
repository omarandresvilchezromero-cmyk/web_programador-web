const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createPool({ host: 'localhost', user: 'omar', password: '040705', database: 'web_programacion' });
  const id_usuario = 16; // usuario de prueba
  const especialidad = 'Prueba QA';
  const experiencia = '3 años';
  const descripcion = 'Prueba automatizada desde test script';
  const fecha = new Date();

  try {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    const [r] = await conn.query('INSERT INTO solicitudes_empleo (id_usuario, especialidad, experiencia, descripcion, fecha_solicitud, estado) VALUES (?, ?, ?, ?, ?, ?)', [id_usuario, especialidad, experiencia, descripcion, fecha, 'pendiente']);
    const solicitudId = r.insertId;

    const [userRows] = await conn.query('SELECT nombre_usuario FROM cuenta_usuario WHERE id_usuarios = ?', [id_usuario]);
    const usuario = userRows.length ? userRows[0] : { nombre_usuario: 'Usuario' };

    const [admins] = await conn.query('SELECT id_usuarios FROM cuenta_usuario WHERE LOWER(rol) IN (?, ?)', ['admin', 'administrador']);
    if (!admins.length) {
      const [[primary]] = await conn.query('SELECT id_usuarios FROM cuenta_usuario WHERE correoUsuario = ?', ['omarandresvilchezromero@gmail.com']);
      if (primary && primary.id_usuarios) admins.push({ id_usuarios: primary.id_usuarios });
    }

    const notifs = [];
    const msgs = [];
    for (const a of admins) {
      notifs.push([a.id_usuarios, `El usuario ${usuario.nombre_usuario} ha enviado una nueva solicitud de empleo.`, fecha, 0]);
      msgs.push([id_usuario, a.id_usuarios, `Nueva solicitud de empleo:\nEspecialidad: ${especialidad}\nExperiencia: ${experiencia}`, fecha, 0]);
    }

    if (notifs.length) await conn.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES ?', [notifs]);
    if (msgs.length) await conn.query('INSERT INTO mensajes (remitente, destinatario, mensaje, fecha_envio, leido) VALUES ?', [msgs]);

    await conn.commit();

    console.log('Solicitud creada con id:', solicitudId);

    const [n] = await pool.query('SELECT * FROM notificaciones WHERE fecha_notificacion >= ? ORDER BY fecha_notificacion DESC LIMIT 10', [new Date(Date.now() - 60000)]);
    console.log('Notificaciones recientes:', n);

    const [m] = await pool.query('SELECT * FROM mensajes WHERE fecha_envio >= ? ORDER BY fecha_envio DESC LIMIT 10', [new Date(Date.now() - 60000)]);
    console.log('Mensajes recientes:', m);

    conn.release();
  } catch (err) {
    console.error('ERROR en test script:', err);
  } finally {
    await pool.end();
  }
})();
