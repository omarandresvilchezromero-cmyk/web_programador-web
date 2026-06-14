const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./conexion mysql.js');

const app = express();
const PORT = process.env.PORT || 3000;
const PRIMARY_ADMIN_EMAIL = 'omarandresvilchezromero@gmail.com';

const allowedOrigins = [
  process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS no permitido para el origen ' + origin), false);
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
// LOG TEMPORAL: Capturar peticiones antes de bodyParser para diagnosticar 413
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentLength = req.headers['content-length'];
    console.log(`[INCOMING REQUEST] ${req.method} ${req.path} | Content-Length: ${contentLength} bytes | Content-Type: ${req.headers['content-type']}`);
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// LOG TEMPORAL: Manejador de errores de body-parser (413 Payload Too Large, etc)
app.use((err, req, res, next) => {
  if (err.status === 413 || err.message.includes('payload')) {
    console.log(`[ERROR 413] ${req.method} ${req.path}`);
    console.log(`[ERROR 413] Content-Length: ${req.headers['content-length']} bytes`);
    console.log(`[ERROR 413] Content-Type: ${req.headers['content-type']}`);
    console.log(`[ERROR 413] Error: ${err.message}`);
    return res.status(413).json({ error: 'Payload too large', details: err.message });
  }
  next(err);
});

// Servir archivos estáticos desde la carpeta htmls para que frontend y API compartan origen
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

const sessionOptions = {
  secret: 'cambiar_por_un_secreto_seguro',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    secure: false,
    path: '/'
  }
};

app.use(session(sessionOptions));
console.log('SESSION CONFIG:', JSON.stringify(sessionOptions, null, 2));

// Registro de usuario
app.post('/api/register', async (req, res) => {
  const { nombre_usuario, correoUsuario, contrasenia } = req.body;
  if (!correoUsuario || !contrasenia) return res.status(400).json({ error: 'Faltan campos' });

  try {
    const [existing] = await pool.query('SELECT id_usuarios AS id FROM cuenta_usuario WHERE correoUsuario = ?', [correoUsuario]);
    if (existing.length) return res.status(409).json({ error: 'Correo ya registrado' });

    const hashed = await bcrypt.hash(contrasenia, 10);
    const fecha = new Date();
    const rol = 'Usuario';

    const [result] = await pool.query(
      'INSERT INTO cuenta_usuario (nombre_usuario, correoUsuario, contrasenia, fecha_decreacion, rol) VALUES (?, ?, ?, ?, ?)',
      [nombre_usuario, correoUsuario, hashed, fecha, rol]
    );

    // Crear sesión (no hay campo estado en la tabla)
    req.session.user = { id: result.insertId, nombre_usuario, correoUsuario, rol };
    console.log('RESPUESTA ENVIADA:', { ok: true, user: req.session.user });
    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { correoUsuario, nombre_usuario, contrasenia } = req.body;
  console.log('BODY RECIBIDO:', req.body);
  console.log('BODY FIELDS:', { correoUsuario, nombre_usuario, contrasenia });
  console.log('REQUEST HEADERS:', {
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer,
    cookie: req.headers.cookie,
    'content-type': req.headers['content-type']
  });
  // Log recibido completo
  try { console.log('LOGIN RECIBIDO:', req.body); } catch(e) { console.log('LOGIN RECIBIDO: [could not stringify]'); }
  console.log('=== DEBUG POST /api/login ===');
  console.log('BODY (masked):', JSON.stringify({correoUsuario, nombre_usuario, contrasenia: contrasenia ? '***' : undefined}));
  console.log('SESSION ANTES:', JSON.stringify(req.session, null, 2));

  if ((!correoUsuario && !nombre_usuario) || !contrasenia) {
    const obj = { ok: false, error: 'Faltan campos' };
    console.log('RESPUESTA LOGIN:', obj);
    return res.status(400).json(obj);
  }

  try {
    const [rows] = await pool.query('SELECT id_usuarios, nombre_usuario, correoUsuario, contrasenia, rol FROM cuenta_usuario WHERE correoUsuario = ? OR nombre_usuario = ?', [correoUsuario || nombre_usuario, nombre_usuario || correoUsuario]);
    if (!rows.length) {
      const obj = { ok: false, error: 'Credenciales inválidas' };
      console.log('USUARIO ENCONTRADO: []');
      console.log('RESPUESTA LOGIN:', obj);
      return res.status(401).json(obj);
    }

    const user = rows[0];
    // Mostrar exactamente lo que devolvió MySQL (no imprimas el hash en claro)
    try {
      const userForLog = Object.assign({}, user, { contrasenia: user.contrasenia ? '***HASH***' : undefined });
      console.log('USUARIO ENCONTRADO:', userForLog);
    } catch (e) { console.log('USUARIO ENCONTRADO: [could not stringify]'); }

    const match = await bcrypt.compare(contrasenia, user.contrasenia);
    console.log('RESULTADO BCRYPT:', match);
    if (!match) {
      const obj = { ok: false, error: 'Credenciales inválidas' };
      console.log('BCRYPT COMPARE RESULT: false');
      console.log('BCRYPT FAILURE STACK:', new Error().stack);
      console.log('RESPUESTA LOGIN:', obj);
      return res.status(401).json(obj);
    }

    req.session.user = {
      id: user.id_usuarios,
      nombre: user.nombre_usuario,
      nombre_usuario: user.nombre_usuario,
      correo: user.correoUsuario,
      correoUsuario: user.correoUsuario,
      rol: user.rol
    };
    console.log('SESSION DESPUÉS DEL LOGIN:', JSON.stringify(req.session, null, 2));

    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('ERROR AL GUARDAR SESSION:', err);
          return reject(err);
        }
        console.log('SESSION GUARDADA EXITOSAMENTE');
        resolve();
      });
    });

    const successObj = { ok: true, user: req.session.user };
    console.log('RESPUESTA LOGIN:', successObj);
    res.json(successObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Login seguro alternativo (usa solo columnas existentes)
app.post('/api/login2', async (req, res) => {
  const { correoUsuario, nombre_usuario, contrasenia } = req.body;
  if ((!correoUsuario && !nombre_usuario) || !contrasenia) return res.status(400).json({ error: 'Faltan campos' });

  try {
    const [rows] = await pool.query('SELECT id_usuarios AS id, nombre_usuario, correoUsuario, contrasenia, rol FROM cuenta_usuario WHERE correoUsuario = ? OR nombre_usuario = ?', [correoUsuario || nombre_usuario, nombre_usuario || correoUsuario]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    const match = await bcrypt.compare(contrasenia, user.contrasenia);
    if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

    req.session.user = {
      id: user.id,
      nombre: user.nombre_usuario,
      nombre_usuario: user.nombre_usuario,
      correo: user.correoUsuario,
      correoUsuario: user.correoUsuario,
      rol: user.rol
    };
    console.log('RESPUESTA ENVIADA:', { ok: true, user: req.session.user });
    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'No se pudo cerrar sesión' });
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ ok: true });
  });
});

// Middleware simple de autenticación
function requireAuth(req, res, next) {
  console.log('PROFILE REQUEST');
  console.log('SESSION COMPLETA:', req.session);
  console.log('SESSION USER:', req.session ? req.session.user : null);
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'No autorizado' });
}

// Helper: crear solicitud y notificar a administradores en una transacción
async function createSolicitudAndNotify(poolOrConnection, id_usuario, especialidad, experiencia, descripcion, useConnectionDirectly = false) {
  const fecha_solicitud = new Date();
  let connection;
  try {
    connection = useConnectionDirectly ? poolOrConnection : await pool.getConnection();
    if (!useConnectionDirectly) await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO solicitudes_empleo (id_usuario, especialidad, experiencia, descripcion, fecha_solicitud, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [id_usuario, especialidad, experiencia, descripcion, fecha_solicitud, 'pendiente']
    );

    // Obtener nombre de usuario para mensaje
    const [userRows] = await connection.query('SELECT nombre_usuario FROM cuenta_usuario WHERE id_usuarios = ?', [id_usuario]);
    const usuario = userRows.length ? userRows[0] : { nombre_usuario: 'Usuario' };

    // Buscar administradores
    const [admins] = await connection.query('SELECT id_usuarios FROM cuenta_usuario WHERE LOWER(rol) IN (?, ?)', ['admin', 'administrador']);
    // Fallback si no hay administradores encontrados
    if (!admins.length) {
      const [[primary]] = await connection.query('SELECT id_usuarios FROM cuenta_usuario WHERE correoUsuario = ?', [PRIMARY_ADMIN_EMAIL]);
      if (primary && primary.id_usuarios) admins.push({ id_usuarios: primary.id_usuarios });
    }

    const solicitudId = result.insertId;

    if (admins.length) {
      const notificacionesValues = [];
      const mensajesValues = [];

      for (const admin of admins) {
        const adminId = admin.id_usuarios;
        const notificacionMsg = `El usuario ${usuario.nombre_usuario} ha enviado una nueva solicitud de empleo.`;
        notificacionesValues.push([adminId, notificacionMsg, fecha_solicitud, 0]);

        mensajesValues.push([id_usuario, adminId, `Nueva solicitud de empleo:\nEspecialidad: ${especialidad}\nExperiencia: ${experiencia}`, fecha_solicitud, 0]);
      }

      if (notificacionesValues.length) {
        await connection.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES ?', [notificacionesValues]);
      }
      if (mensajesValues.length) {
        await connection.query('INSERT INTO mensajes (remitente, destinatario, mensaje, fecha_envio, leido) VALUES ?', [mensajesValues]);
      }
    }

    if (!useConnectionDirectly) await connection.commit();
    return { ok: true, id: solicitudId };
  } catch (err) {
    if (connection && !useConnectionDirectly) await connection.rollback().catch(() => {});
    throw err;
  } finally {
    if (connection && !useConnectionDirectly) connection.release();
  }
}

// Crear solicitud de empleo
app.post('/api/solicitudes', requireAuth, async (req, res) => {
  const { especialidad, experiencia, descripcion } = req.body;
  const id_usuario = req.session.user.id;

  if (!especialidad || !experiencia || !descripcion) {
    return res.status(400).json({ error: 'Especialidad, experiencia y descripción son obligatorios' });
  }

  try {
    const [userRows] = await pool.query('SELECT rol FROM cuenta_usuario WHERE id_usuarios = ?', [id_usuario]);
    if (!userRows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const role = (userRows[0].rol || '').toString().toLowerCase();
    if (['admin', 'administrador'].includes(role)) {
      return res.status(403).json({ error: 'Los administradores no pueden enviar solicitudes de empleo' });
    }

    if (role === 'empleado') {
      return res.status(409).json({ error: 'Ya eres empleado' });
    }

    const hasPending = await userHasPendingSolicitud(id_usuario);
    if (hasPending) {
      return res.status(409).json({ error: 'Ya tienes una solicitud de empleo en proceso' });
    }

    const result = await createSolicitudAndNotify(pool, id_usuario, especialidad, experiencia, descripcion);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar solicitud' });
  }
});

// Obtener solicitudes (solo admin)
app.get('/api/admin/solicitudes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.nombre_usuario, u.correoUsuario 
       FROM solicitudes_empleo s 
       LEFT JOIN cuenta_usuario u ON s.id_usuario = u.id_usuarios 
       ORDER BY s.fecha_solicitud DESC`
    );
    res.json({ ok: true, solicitudes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener detalles de una solicitud específica (solo admin)
app.get('/api/admin/solicitudes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const solicitudId = req.params.id;
    const [rows] = await pool.query(
      `SELECT s.*, u.nombre_usuario, u.correoUsuario, u.descripcion, u.especialidad 
       FROM solicitudes_empleo s 
       LEFT JOIN cuenta_usuario u ON s.id_usuario = u.id_usuarios 
       WHERE s.id = ?`,
      [solicitudId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ ok: true, solicitud: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener usuarios (solo admin)
app.get('/api/admin/usuarios', requireAuth, async (req, res) => {
  const role = (req.session.user.rol || '').toString().toLowerCase();
  if (!(role === 'admin' || role === 'administrador')) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query('SELECT id_usuarios AS id, nombre_usuario, correoUsuario, fecha_decreacion AS fechaRegistro, rol FROM cuenta_usuario ORDER BY id_usuarios DESC');

    // Mapear a estructura que espera el frontend
    const usuarios = rows.map(r => ({
      id: r.id,
      nombreCompleto: r.nombre_usuario || r.correoUsuario || 'Sin nombre',
      nombre_usuario: r.nombre_usuario || ('user' + r.id),
      email: r.correoUsuario,
      fechaRegistro: r.fechaRegistro,
      rol: r.rol || 'usuario',
      foto: '👤',
      descripcion: '',
      telefonos: [],
      direccion: '',
      especialidad: ''
    }));

    res.json({ ok: true, usuarios });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Nota: la tabla `cuenta_usuario` no tiene columna `estado`. Este endpoint queda como no implementado.
app.put('/api/admin/usuarios/:id/estado', requireAuth, requireAdmin, async (req, res) => {
  res.status(400).json({ error: 'Campo estado no existe en esquema de usuarios' });
});

app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id_usuarios AS id, nombre_usuario, correoUsuario, rol, fecha_decreacion AS fechaRegistro FROM cuenta_usuario');
    const usuarios = rows.map(u => ({
      id: u.id,
      nombre_usuario: u.nombre_usuario,
      email: u.correoUsuario,
      rol: u.rol,
      fechaRegistro: u.fechaRegistro || null,
      foto: '👤',
      descripcion: '',
      especialidad: ''
    }));

    res.json({ ok: true, usuarios });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Endpoint para verificar sesión
app.get('/api/session', (req, res) => {
  console.log('=== DEBUG GET /api/session ===');
  console.log('SESSION:', JSON.stringify(req.session, null, 2));
  console.log('SESSION USER:', JSON.stringify(req.session ? req.session.user : null, null, 2));
  if (req.session && req.session.user) return res.json({ ok: true, user: req.session.user });
  return res.json({ ok: true, user: null });
});

app.get('/api/debug-session', (req, res) => {
  console.log('=== DEBUG GET /api/debug-session ===');
  console.log('SESSION:', JSON.stringify(req.session, null, 2));
  console.log('SESSION USER:', JSON.stringify(req.session ? req.session.user : null, null, 2));
  res.json({ session: req.session || null, user: req.session ? req.session.user : null });
});

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const role = (req.session.user.rol || '').toString().toLowerCase();
  if (role === 'admin' || role === 'administrador') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

async function userIsEmployee(userId) {
  const [rows] = await pool.query('SELECT rol FROM cuenta_usuario WHERE id_usuarios = ?', [userId]);
  return rows.length && (rows[0].rol || '').toString().toLowerCase() === 'empleado';
}

async function userIsAdmin(userId) {
  const [rows] = await pool.query('SELECT rol FROM cuenta_usuario WHERE id_usuarios = ?', [userId]);
  return rows.length && ['admin', 'administrador'].includes((rows[0].rol || '').toString().toLowerCase());
}

async function userHasPendingSolicitud(userId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM solicitudes_empleo WHERE id_usuario = ? AND estado IN (?, ?, ?)",
    [userId, 'pendiente', 'info_requerida', 'entrevista']
  );
  return rows.length && rows[0].total > 0;
}

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    console.log('=== DEBUG GET /api/profile ===');
    console.log('SESSION:', JSON.stringify(req.session, null, 2));
    console.log('SESSION.USER:', JSON.stringify(req.session.user, null, 2));
    console.log('USER.ID USADO EN QUERY:', req.session.user.id);
    
    const [rows] = await pool.query(
      'SELECT id_usuarios AS id, nombre_usuario, correoUsuario, fecha_decreacion AS fechaRegistro, rol, descripcion, especialidad, foto FROM cuenta_usuario WHERE id_usuarios = ?',
      [req.session.user.id]
    );

    console.log('QUERY RESULT ROWS:', JSON.stringify(rows, null, 2));
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = rows[0];
    console.log('USER OBJECT:', JSON.stringify(user, null, 2));
    const [empleadoRows] = await pool.query('SELECT * FROM empleados WHERE id_usuario = ? LIMIT 1', [user.id]);

    const responseData = {
      ok: true,
      user: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        correoUsuario: user.correoUsuario,
        fechaRegistro: user.fechaRegistro,
        rol: user.rol,
        descripcion: user.descripcion || '',
        especialidad: user.especialidad || '',
        foto: user.foto || 'https://via.placeholder.com/120'
      },
      empleado: empleadoRows[0] || null
    };
      console.log('RESPUESTA ENVIADA:', JSON.stringify(responseData, null, 2));
      return res.json(responseData);
  } catch (err) {
    console.error('ERROR EN GET /api/profile:', err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

app.put('/api/profile', requireAuth, async (req, res) => {
  const { nombre_usuario, especialidad, descripcion, foto } = req.body;
  const updates = [];
  const params = [];

  if (nombre_usuario) {
    updates.push('nombre_usuario = ?');
    params.push(nombre_usuario);
  }
  if (especialidad !== undefined) {
    updates.push('especialidad = ?');
    params.push(especialidad);
  }
  if (descripcion !== undefined) {
    updates.push('descripcion = ?');
    params.push(descripcion);
  }
  if (foto !== undefined) {
    updates.push('foto = ?');
    params.push(foto);
  }

  if (!updates.length) {
    return res.json({ ok: true });
  }

  params.push(req.session.user.id);

  try {
    await pool.query(`UPDATE cuenta_usuario SET ${updates.join(', ')} WHERE id_usuarios = ?`, params);
    const [rows] = await pool.query(
      'SELECT id_usuarios AS id, nombre_usuario, correoUsuario, fecha_decreacion AS fechaRegistro, rol, descripcion, especialidad, foto FROM cuenta_usuario WHERE id_usuarios = ?',
      [req.session.user.id]
    );

    const user = rows[0];
    req.session.user = {
      id: user.id,
      nombre_usuario: user.nombre_usuario,
      correoUsuario: user.correoUsuario,
      rol: user.rol
    };

      console.log('RESPUESTA ENVIADA:', { ok: true, user: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        correoUsuario: user.correoUsuario,
        fechaRegistro: user.fechaRegistro,
        rol: user.rol,
        descripcion: user.descripcion || '',
        especialidad: user.especialidad || '',
        foto: user.foto || 'https://via.placeholder.com/120'
      } });
      return res.json({ ok: true, user: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        correoUsuario: user.correoUsuario,
        fechaRegistro: user.fechaRegistro,
        rol: user.rol,
        descripcion: user.descripcion || '',
        especialidad: user.especialidad || '',
        foto: user.foto || 'https://via.placeholder.com/120'
      } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

app.get('/api/solicitudes', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM solicitudes_empleo WHERE id_usuario = ? ORDER BY fecha_solicitud DESC', [req.session.user.id]);
    res.json({ ok: true, solicitudes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

app.put('/api/admin/solicitudes/:id', requireAuth, requireAdmin, async (req, res) => {
  const solicitudId = req.params.id;
  const { action, razonRechazo, insignia, pregunta } = req.body;
  const fecha = new Date();

  try {
    const [solicitudes] = await pool.query('SELECT * FROM solicitudes_empleo WHERE id = ?', [solicitudId]);
    if (!solicitudes.length) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const solicitud = solicitudes[0];
    const adminNombre = req.session.user.nombre_usuario;

    // APROBAR SOLICITUD
    if (action === 'approve') {
      const estado = 'Aceptada';
      await pool.query('UPDATE solicitudes_empleo SET estado = ?, fecha_aprobacion = ? WHERE id = ?', [estado, fecha, solicitudId]);
      await pool.query('UPDATE cuenta_usuario SET rol = ? WHERE id_usuarios = ?', ['Empleado', solicitud.id_usuario]);
      const [empleadoRes] = await pool.query('INSERT INTO empleados (id_usuario, especialidad, experiencia, insignia, fecha_ingreso, estado, solicitud_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        solicitud.id_usuario,
        solicitud.especialidad,
        solicitud.experiencia,
        insignia || 'empleado-verificado',
        fecha,
        'Disponible',
        solicitud.id
      ]);
      const empleadoId = empleadoRes.insertId || null;
      // Crear perfil_empleado si existe la tabla
      try {
        await pool.query('INSERT INTO perfil_empleado (id_empleado, id_usuario, especialidad, experiencia, descripcion, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?)', [
          empleadoId,
          solicitud.id_usuario,
          solicitud.especialidad,
          solicitud.experiencia,
          solicitud.descripcion || '',
          'Disponible',
          fecha
        ]);
      } catch (e) {
        console.warn('perfil_empleado no existe o no pudo crearse:', e.message || e);
      }
      await pool.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, ?, ?)', [
        solicitud.id_usuario,
        'Tu solicitud de empleo fue aprobada y ahora eres empleado.',
        fecha,
        0
      ]);
      await pool.query('INSERT INTO mensajes (remitente, destinatario, mensaje, fecha_envio, leido) VALUES (?, ?, ?, ?, ?)', [
        req.session.user.id,
        solicitud.id_usuario,
        `¡Felicidades! Tu solicitud de empleo ha sido aprobada. Bienvenido al equipo.`,
        fecha,
        0
      ]);
      await pool.query('INSERT INTO empleados_auditoria (id_empleado, id_usuario, id_admin, accion, detalle, fecha) VALUES (?, ?, ?, ?, ?, ?)', [
        empleadoId,
        solicitud.id_usuario,
        req.session.user.id,
        'aprobacion',
        `Solicitud aprobada e empleado creado con insignia ${insignia || 'empleado-verificado'}`,
        fecha
      ]).catch(() => {});
      return res.json({ ok: true, message: 'Solicitud aprobada y empleado creado' });
    }

    // RECHAZAR SOLICITUD
    if (action === 'reject') {
      const estado = 'rechazada';
      await pool.query('UPDATE solicitudes_empleo SET estado = ?, razon_rechazo = ? WHERE id = ?', [estado, razonRechazo || null, solicitudId]);
      await pool.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, ?, ?)', [
        solicitud.id_usuario,
        `Tu solicitud de empleo fue rechazada. ${razonRechazo || ''}`,
        fecha,
        0
      ]);
      await pool.query('INSERT INTO mensajes (remitente, destinatario, mensaje, fecha_envio, leido) VALUES (?, ?, ?, ?, ?)', [
        req.session.user.id,
        solicitud.id_usuario,
        `Lamentablemente, tu solicitud de empleo no fue aceptada en esta ocasión. ${razonRechazo || 'Puedes intentarlo nuevamente más adelante.'}`,
        fecha,
        0
      ]);
      await pool.query('INSERT INTO empleados_auditoria (id_empleado, id_usuario, id_admin, accion, detalle, fecha) VALUES (?, ?, ?, ?, ?, ?)', [
        null,
        solicitud.id_usuario,
        req.session.user.id,
        'rechazo',
        `Solicitud rechazada. Razón: ${razonRechazo || 'Sin razón especificada'}`,
        fecha
      ]).catch(() => {});
      return res.json({ ok: true, message: 'Solicitud rechazada' });
    }

    // SOLICITAR MÁS INFORMACIÓN
    if (action === 'info-request') {
      await pool.query('UPDATE solicitudes_empleo SET estado = ?, info_solicitada = ? WHERE id = ?', ['info_requerida', pregunta || null, solicitudId]);
      await pool.query('INSERT INTO mensajes (remitente, destinatario, mensaje, fecha_envio, leido) VALUES (?, ?, ?, ?, ?)', [
        req.session.user.id,
        solicitud.id_usuario,
        `El administrador ${adminNombre} necesita más información sobre tu solicitud:\n\n${pregunta || 'Por favor, proporciona más detalles'}`,
        fecha,
        0
      ]);
      await pool.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, ?, ?)', [
        solicitud.id_usuario,
        'El administrador ha solicitado más información sobre tu solicitud de empleo.',
        fecha,
        0
      ]);
      await pool.query('INSERT INTO empleados_auditoria (id_empleado, id_usuario, id_admin, accion, detalle, fecha) VALUES (?, ?, ?, ?, ?, ?)', [
        null,
        solicitud.id_usuario,
        req.session.user.id,
        'info_request',
        `Solicitud solicitó más información: ${pregunta || 'No se especificó pregunta'}`,
        fecha
      ]).catch(() => {});
      return res.json({ ok: true, message: 'Se solicitó información adicional' });
    }

    // AGENDAR ENTREVISTA
    if (action === 'schedule-interview') {
      const { entrevistaFecha } = req.body;
      if (!entrevistaFecha) {
        return res.status(400).json({ error: 'Fecha de entrevista requerida' });
      }
      await pool.query('UPDATE solicitudes_empleo SET estado = ?, fecha_entrevista = ?, info_solicitada = ? WHERE id = ?', ['entrevista', entrevistaFecha, pregunta || null, solicitudId]);
      await pool.query('INSERT INTO mensajes (remitente, destinatario, mensaje, fecha_envio, leido) VALUES (?, ?, ?, ?, ?)', [
        req.session.user.id,
        solicitud.id_usuario,
        `Tu entrevista ha sido programada para ${entrevistaFecha}. ${pregunta ? '\n\nInstrucciones: ' + pregunta : ''}`,
        fecha,
        0
      ]);
      await pool.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, ?, ?)', [
        solicitud.id_usuario,
        `Se ha programado una entrevista para tu solicitud de empleo: ${entrevistaFecha}.`,
        fecha,
        0
      ]);
      await pool.query('INSERT INTO empleados_auditoria (id_empleado, id_usuario, id_admin, accion, detalle, fecha) VALUES (?, ?, ?, ?, ?, ?)', [
        null,
        solicitud.id_usuario,
        req.session.user.id,
        'schedule_interview',
        `Entrevista programada para ${entrevistaFecha} con nota: ${pregunta || 'Sin nota'}`,
        fecha
      ]).catch(() => {});
      return res.json({ ok: true, message: 'Entrevista programada' });
    }

    res.status(400).json({ error: 'Acción inválida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
});

// Guardar consulta desde formulario de contacto y asignar empleado disponible
app.post('/api/consultas', requireAuth, async (req, res) => {
  const { asunto, descripcion, servicio_tipo } = req.body;
  const usuarioId = req.session.user.id;
  const fecha_creacion = new Date();

  try {
    // Insertar consulta
    const [result] = await pool.query('INSERT INTO consultas (id_usuario, asunto, descripcion, servicio_tipo, fecha_creacion, estado) VALUES (?, ?, ?, ?, ?, ?)', [
      usuarioId, asunto || '', descripcion || '', servicio_tipo || null, fecha_creacion, 'pendiente'
    ]);
    const consultaId = result.insertId;

    // Asignar empleado disponible
    let empleadoAsignado = null;
    try {
      const [empleadosDisponibles] = await pool.query("SELECT id_empleado, id_usuario FROM empleados WHERE estado = 'Disponible' ORDER BY fecha_ingreso ASC LIMIT 1");
      if (empleadosDisponibles.length) {
        empleadoAsignado = empleadosDisponibles[0];
        await pool.query('UPDATE consultas SET id_empleado_responsable = ?, estado = ? WHERE id = ?', [empleadoAsignado.id_empleado, 'asignada', consultaId]);
        // Notificación y mensaje para el empleado
        await pool.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, ?, ?)', [
          empleadoAsignado.id_usuario,
          `Se te ha asignado una nueva consulta (id: ${consultaId}).` ,
          fecha_creacion,
          0
        ]);
        await pool.query('INSERT INTO mensajes (remitente, destinatario, mensaje, fecha_envio, leido) VALUES (?, ?, ?, ?, ?)', [
          usuarioId,
          empleadoAsignado.id_usuario,
          `Nueva consulta asignada: ${asunto || 'Sin asunto'}\n\n${descripcion || ''}`,
          fecha_creacion,
          0
        ]);
      }
    } catch (e) {
      console.warn('Error asignando empleado disponible:', e.message || e);
    }

    return res.json({ ok: true, consultaId, asignado: !!empleadoAsignado });
  } catch (err) {
    console.error('Error creando consulta:', err);
    return res.status(500).json({ error: 'Error al crear consulta' });
  }
});

// Calificaciones de empleados
app.post('/api/empleados/:id/calificaciones', requireAuth, async (req, res) => {
  const empleadoId = Number(req.params.id);
  const usuarioId = req.session.user.id;
  const { puntuacion, comentario } = req.body;
  const fecha = new Date();

  if (!empleadoId || !puntuacion) return res.status(400).json({ error: 'Datos incompletos' });

  try {
    await pool.query('INSERT INTO calificaciones_empleado (id_empleado, id_usuario, puntuacion, comentario, fecha) VALUES (?, ?, ?, ?, ?)', [
      empleadoId, usuarioId, puntuacion, comentario || '', fecha
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error guardando calificación:', err);
    return res.status(500).json({ error: 'Error al guardar calificación' });
  }
});

app.get('/api/empleados/:id/calificaciones', requireAuth, async (req, res) => {
  const empleadoId = Number(req.params.id);
  try {
    const [rows] = await pool.query('SELECT * FROM calificaciones_empleado WHERE id_empleado = ? ORDER BY fecha DESC', [empleadoId]);
    return res.json({ ok: true, calificaciones: rows });
  } catch (err) {
    console.error('Error obteniendo calificaciones:', err);
    return res.status(500).json({ error: 'Error al obtener calificaciones' });
  }
});

// Métricas básicas del empleado
app.get('/api/empleados/:id/metrics', requireAuth, async (req, res) => {
  const empleadoId = Number(req.params.id);
  try {
    const [[{ consultasAtendidas = 0 }]] = await pool.query("SELECT COUNT(*) AS consultasAtendidas FROM consultas WHERE id_empleado_responsable = ? AND estado = 'atendido'", [empleadoId]);
    const [[{ serviciosCompletados = 0 }]] = await pool.query("SELECT COUNT(*) AS serviciosCompletados FROM servicios_servidores WHERE id_empleado_responsable = ? AND estado = 'finalizado'", [empleadoId]);
    const [[{ tiempoPromedio = null }]] = await pool.query("SELECT AVG(TIMESTAMPDIFF(SECOND, fecha_creacion, fecha_atencion)) AS tiempoPromedio FROM consultas WHERE id_empleado_responsable = ? AND fecha_atencion IS NOT NULL", [empleadoId]);
    const [[{ avgRating = null }]] = await pool.query("SELECT AVG(puntuacion) AS avgRating FROM calificaciones_empleado WHERE id_empleado = ?", [empleadoId]);

    return res.json({ ok: true, metrics: { consultasAtendidas: Number(consultasAtendidas), serviciosCompletados: Number(serviciosCompletados), tiempoPromedio: tiempoPromedio !== null ? Number(tiempoPromedio) : null, avgRating: avgRating !== null ? Number(avgRating) : null } });
  } catch (err) {
    console.error('Error obteniendo métricas:', err);
    return res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

// Obtener datos del empleado para el usuario en sesión
app.get('/api/empleados/me', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [rows] = await pool.query('SELECT * FROM empleados WHERE id_usuario = ? LIMIT 1', [userId]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'No eres empleado' });
    const empleado = rows[0];
    return res.json({ ok: true, empleado });
  } catch (err) {
    console.error('Error obteniendo empleado:', err);
    return res.status(500).json({ error: 'Error al obtener datos de empleado' });
  }
});

// Consultas asignadas a empleado
app.get('/api/empleados/:id/consultas', requireAuth, async (req, res) => {
  const empleadoId = Number(req.params.id);
  try {
    const [rows] = await pool.query('SELECT * FROM consultas WHERE id_empleado_responsable = ? ORDER BY fecha_creacion DESC', [empleadoId]);
    return res.json({ ok: true, consultas: rows });
  } catch (err) {
    console.error('Error obteniendo consultas del empleado:', err);
    return res.status(500).json({ error: 'Error al obtener consultas' });
  }
});

// Servicios asignados a empleado
app.get('/api/empleados/:id/servicios', requireAuth, async (req, res) => {
  const empleadoId = Number(req.params.id);
  try {
    const [rows] = await pool.query('SELECT * FROM servicios_servidores WHERE id_empleado_responsable = ? ORDER BY id_servicio DESC', [empleadoId]);
    return res.json({ ok: true, servicios: rows });
  } catch (err) {
    console.error('Error obteniendo servicios del empleado:', err);
    return res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

app.get('/api/admin/empleados', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT e.*, u.nombre_usuario AS user_nombre, u.correoUsuario AS user_email FROM empleados e LEFT JOIN cuenta_usuario u ON e.id_usuario = u.id_usuarios ORDER BY e.fecha_ingreso DESC'
    );
    res.json({ ok: true, empleados: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[{ total: totalUsuarios }]] = await pool.query('SELECT COUNT(*) AS total FROM cuenta_usuario');
    const [[{ total: totalEmpleados }]] = await pool.query('SELECT COUNT(*) AS total FROM empleados');
    const [[{ total: solicitudesPendientes }]] = await pool.query('SELECT COUNT(*) AS total FROM solicitudes_empleo WHERE estado = ?', ['pendiente']);
    const [[{ total: notificacionesNoLeidas }]] = await pool.query('SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = ? AND leida = 0', [req.session.user.id]);

    res.json({ ok: true, stats: { usuarios: totalUsuarios, empleados: totalEmpleados, solicitudesPendientes, notificacionesNoLeidas } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

app.put('/api/admin/usuarios/:id/state', requireAuth, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { rol } = req.body;
  if (!rol) return res.status(400).json({ error: 'No se proporcionó rol' });
  try {
    await pool.query('UPDATE cuenta_usuario SET rol = ? WHERE id_usuarios = ?', [rol, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.delete('/api/admin/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    await pool.query('DELETE FROM cuenta_usuario WHERE id_usuarios = ?', [userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

app.get('/api/novedades', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM novedades ORDER BY fecha_publicacion DESC');
    res.json({ ok: true, novedades: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener novedades' });
  }
});

app.post('/api/admin/novedades', requireAuth, requireAdmin, async (req, res) => {
  const { titulo, descripcion, cpu, ram, precio, badge, icono } = req.body;
  const fecha = new Date();

  try {
    await pool.query(
      'INSERT INTO novedades (titulo, descripcion, cpu, ram, precio, badge, icono, creado_por, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [titulo, descripcion, cpu, ram, precio, badge, icono, req.session.user.id, fecha]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear novedad' });
  }
});

app.get('/api/notificaciones', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notificaciones WHERE id_usuario = ? ORDER BY fecha_notificacion DESC', [req.session.user.id]);
      console.log('RESPUESTA ENVIADA:', { ok: true, notificaciones: rows.length });
      return res.json({ ok: true, notificaciones: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

app.put('/api/notificaciones/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?', [req.params.id, req.session.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar notificación' });
  }
});

app.delete('/api/notificaciones/clear', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE id_usuario = ?', [req.session.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al limpiar notificaciones' });
  }
});

app.get('/api/mensajes/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [rows] = await pool.query(
      'SELECT * FROM mensajes WHERE remitente = ? OR destinatario = ? ORDER BY fecha_envio DESC',
      [userId, userId]
    );
      // Mapear filas a la estructura que espera el frontend
      const mensajes = rows.map(r => ({
        id: r.id_mensaje || r.id || null,
        remitente_id: r.remitente,
        destinatario_id: r.destinatario,
        contenido: r.mensaje,
        fecha: r.fecha_envio || r.fecha,
        leido: r.leido || 0
      }));
      console.log('RESPUESTA ENVIADA:', { ok: true, mensajes: mensajes.length });
      return res.json({ ok: true, mensajes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

app.get('/api/mensajes/conversation', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const withId = Number(req.query.with);
    if (!withId) return res.status(400).json({ error: 'Falta destinatario' });

    const [rows] = await pool.query(
      'SELECT * FROM mensajes WHERE (remitente = ? AND destinatario = ?) OR (remitente = ? AND destinatario = ?) ORDER BY fecha_envio ASC',
      [userId, withId, withId, userId]
    );
    const mensajes = rows.map(r => ({
      id: r.id_mensaje || r.id || null,
      remitente_id: r.remitente,
      destinatario_id: r.destinatario,
      contenido: r.mensaje,
      fecha: r.fecha_envio || r.fecha,
      leido: r.leido || 0
    }));
    res.json({ ok: true, mensajes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
});

app.post('/api/mensajes', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const destinatario = req.body.destinatario || req.body.destinatario_id;
  const mensaje = req.body.mensaje || req.body.contenido;
  const fecha_envio = new Date();

  if (!destinatario || !mensaje) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO mensajes (remitente, destinatario, mensaje, fecha_envio, leido) VALUES (?, ?, ?, ?, ?)',
      [userId, destinatario, mensaje, fecha_envio, 0]
    );

    await pool.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, ?, ?)', [
      destinatario,
      `Tienes un nuevo mensaje de ${req.session.user.nombre_usuario}`,
      fecha_envio,
      0
    ]);

    console.log('RESPUESTA ENVIADA:', { ok: true, id: result.insertId });
    return res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

/* =========================
   API VENTAS / PRODUCTOS / SERVICIOS
   ========================= */

// Listar productos disponibles (frontend consume esto)
app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products_vendidos');
    return res.json({ ok: true, productos: rows });
  } catch (err) {
    console.error('Error GET /api/productos', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener productos' });
  }
});

// Listar servicios de servidores
app.get('/api/servicios/servidores', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM servicios_servidores');
    return res.json({ ok: true, servicios: rows });
  } catch (err) {
    console.error('Error GET /api/servicios/servidores', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener servicios' });
  }
});

// Listar servicios de seguridad
app.get('/api/servicios/seguridad', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM servicios_seguridad');
    return res.json({ ok: true, servicios: rows });
  } catch (err) {
    console.error('Error GET /api/servicios/seguridad', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener servicios' });
  }
});

function ensureCartSession(req) {
  if (!req.session) return null;
  req.session.cart = req.session.cart || [];
  return req.session.cart;
}

function calculateCart(cart) {
  const items = (cart || []).map((item) => ({
    ...item,
    subtotal: Number(item.precio || 0) * Number(item.cantidad || 1)
  }));
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, total };
}

async function hydrateCartItems(cart) {
  const connection = await pool.getConnection();
  try {
    const hydrated = [];
    for (const item of cart || []) {
      const lookup = await resolveItemData(connection, item);
      hydrated.push({
        ...item,
        label: lookup.label,
        precio: lookup.precio,
        subtotal: Number(lookup.precio) * Number(item.cantidad || 1)
      });
    }
    return hydrated;
  } finally {
    connection.release();
  }
}

app.get('/api/carrito', requireAuth, async (req, res) => {
  const cart = ensureCartSession(req);
  const hydrated = await hydrateCartItems(cart);
  const total = hydrated.reduce((sum, item) => sum + item.subtotal, 0);
  return res.json({ ok: true, cart: hydrated, total });
});

app.post('/api/carrito', requireAuth, async (req, res) => {
  const { type, id, cantidad = 1 } = req.body || {};
  if (!type || !id) return res.status(400).json({ ok: false, error: 'type e id son obligatorios' });
  const qty = Math.max(1, Number(cantidad) || 1);
  const cart = ensureCartSession(req);
  const itemKey = `${type}-${id}`;
  const existing = cart.find((item) => item.itemKey === itemKey);
  if (existing) {
    existing.cantidad = existing.cantidad + qty;
  } else {
    cart.push({ itemKey, type, id: Number(id), cantidad: qty });
  }
  const hydrated = await hydrateCartItems(cart);
  const total = hydrated.reduce((sum, item) => sum + item.subtotal, 0);
  return res.json({ ok: true, cart: hydrated, total });
});

app.put('/api/carrito/:itemKey', requireAuth, async (req, res) => {
  const { itemKey } = req.params;
  const { cantidad } = req.body || {};
  const qty = Math.max(0, Number(cantidad) || 0);
  const cart = ensureCartSession(req);
  const index = cart.findIndex((item) => item.itemKey === itemKey);
  if (index < 0) return res.status(404).json({ ok: false, error: 'Item no encontrado en el carrito' });
  if (qty <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].cantidad = qty;
  }
  const hydrated = await hydrateCartItems(cart);
  const total = hydrated.reduce((sum, item) => sum + item.subtotal, 0);
  return res.json({ ok: true, cart: hydrated, total });
});

app.delete('/api/carrito/:itemKey', requireAuth, async (req, res) => {
  const { itemKey } = req.params;
  const cart = ensureCartSession(req);
  req.session.cart = cart.filter((item) => item.itemKey !== itemKey);
  const hydrated = await hydrateCartItems(req.session.cart);
  const total = hydrated.reduce((sum, item) => sum + item.subtotal, 0);
  return res.json({ ok: true, cart: hydrated, total });
});

async function resolveItemData(connection, item) {
  const id = Number(item.id);
  if (item.type === 'producto') {
    const [rows] = await connection.query('SELECT precio, nombre FROM products_vendidos WHERE id_producto = ?', [id]);
    if (!rows.length) throw new Error('Producto no encontrado: ' + id);
    return { precio: Number(rows[0].precio || 0), label: rows[0].nombre || 'Producto' };
  }
  if (item.type === 'servidor') {
    const [rows] = await connection.query('SELECT precio, tipo FROM servicios_servidores WHERE id_servicio = ?', [id]);
    if (!rows.length) throw new Error('Servicio servidor no encontrado: ' + id);
    return { precio: Number(rows[0].precio || 0), label: rows[0].tipo || 'Servicio servidor' };
  }
  if (item.type === 'seguridad') {
    const [rows] = await connection.query('SELECT precio, nombre FROM servicios_seguridad WHERE id_servicio = ?', [id]);
    if (!rows.length) throw new Error('Servicio seguridad no encontrado: ' + id);
    return { precio: Number(rows[0].precio || 0), label: rows[0].nombre || 'Servicio seguridad' };
  }
  throw new Error('Tipo de item inválido: ' + item.type);
}

app.post('/api/venta', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const bodyItems = req.body && Array.isArray(req.body.items) ? req.body.items : null;
  const cart = ensureCartSession(req) || [];
  const items = bodyItems && bodyItems.length ? bodyItems : cart;
  if (!items || !items.length) return res.status(400).json({ ok: false, error: 'No se proporcionaron items para la venta' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const ventaGroup = `${userId}-${Date.now()}`;
    let totalVenta = 0;

    const [ventaResult] = await connection.query(
      'INSERT INTO ventas (venta_group, id_usuario, total, fecha_compra, estado) VALUES (?, ?, ?, NOW(), ?)',
      [ventaGroup, userId, 0, 'completada']
    );
    const idVenta = ventaResult.insertId;

    for (const item of items) {
      const cantidad = Math.max(1, Number(item.cantidad) || 1);
      const { precio, label } = await resolveItemData(connection, item);
      const subtotal = Number(precio) * cantidad;
      totalVenta += subtotal;

      await connection.query(
        'INSERT INTO venta_items (id_venta, tipo, referencia_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [idVenta, item.type, Number(item.id), cantidad, precio, subtotal]
      );

      await connection.query(
        'INSERT INTO ventashay (venta_group, id_usuario, id_producto, id_servicio_servidor, id_servicio_seguridad, cantidad, total, fecha_compra, estado) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
        [ventaGroup, userId,
          item.type === 'producto' ? Number(item.id) : null,
          item.type === 'servidor' ? Number(item.id) : null,
          item.type === 'seguridad' ? Number(item.id) : null,
          cantidad, subtotal, 'completada']
      );
    }

    await connection.query('UPDATE ventas SET total = ? WHERE id_venta = ?', [totalVenta, idVenta]);

    await connection.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, NOW(), ?)', [userId, 'Compra realizada correctamente', 0]);

    await connection.commit();
    req.session.cart = [];
    return res.json({ ok: true, ventaGroup, total: totalVenta });
  } catch (err) {
    console.error('Error POST /api/venta', err);
    if (connection) await connection.rollback();
    return res.status(500).json({ ok: false, error: err.message || 'Error al procesar compra' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/mis-compras', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT v.*, p.nombre AS producto_nombre, s.tipo AS servicio_servidor_tipo, ss.nombre AS servicio_seguridad_nombre, u.nombre_usuario AS comprador
       FROM ventashay v
       LEFT JOIN products_vendidos p ON v.id_producto = p.id_producto
       LEFT JOIN servicios_servidores s ON v.id_servicio_servidor = s.id_servicio
       LEFT JOIN servicios_seguridad ss ON v.id_servicio_seguridad = ss.id_servicio
       LEFT JOIN cuenta_usuario u ON v.id_usuario = u.id_usuarios
       WHERE v.id_usuario = ?
       ORDER BY v.fecha_compra DESC`,
      [userId]
    );
    return res.json({ ok: true, ventas: rows });
  } catch (err) {
    console.error('Error GET /api/mis-compras', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener compras' });
  }
});

app.get('/api/admin/productos', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products_vendidos');
    return res.json({ ok: true, productos: rows });
  } catch (err) {
    console.error('Error GET /api/admin/productos', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener productos admin' });
  }
});

// Obtener ventas del usuario actual
app.get('/api/ventas', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT v.*, p.nombre AS producto_nombre, s.tipo AS servicio_servidor_tipo, ss.nombre AS servicio_seguridad_nombre, u.nombre_usuario AS comprador
       FROM ventashay v
       LEFT JOIN products_vendidos p ON v.id_producto = p.id_producto
       LEFT JOIN servicios_servidores s ON v.id_servicio_servidor = s.id_servicio
       LEFT JOIN servicios_seguridad ss ON v.id_servicio_seguridad = ss.id_servicio
       LEFT JOIN cuenta_usuario u ON v.id_usuario = u.id_usuarios
       WHERE v.id_usuario = ?
       ORDER BY v.fecha_compra DESC`,
      [userId]
    );
    return res.json({ ok: true, ventas: rows });
  } catch (err) {
    console.error('Error GET /api/ventas', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener ventas' });
  }
});

// Registrar compra (acepta array de items)
app.post('/api/ventas', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ ok: false, error: 'No se proporcionaron items' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const ventaGroup = `${userId}-${Date.now()}`;
    let totalVenta = 0;

    for (const it of items) {
      const tipo = it.type;
      const id = Number(it.id);
      const cantidad = Number(it.cantidad) || 1;

      if (tipo === 'producto') {
        const [rows] = await connection.query('SELECT precio, nombre FROM products_vendidos WHERE id_producto = ?', [id]);
        if (!rows.length) throw new Error('Producto no encontrado: ' + id);
        const precio = Number(rows[0].precio || 0);
        const subtotal = precio * cantidad;
        totalVenta += subtotal;
        await connection.query('INSERT INTO ventashay (venta_group, id_usuario, id_producto, cantidad, total, fecha_compra, estado) VALUES (?, ?, ?, ?, ?, NOW(), ?)', [ventaGroup, userId, id, cantidad, subtotal, 'completada']);
      } else if (tipo === 'servidor') {
        const [rows] = await connection.query('SELECT precio, tipo FROM servicios_servidores WHERE id_servicio = ?', [id]);
        if (!rows.length) throw new Error('Servicio servidor no encontrado: ' + id);
        const precio = Number(rows[0].precio || 0);
        const subtotal = precio * cantidad;
        totalVenta += subtotal;
        await connection.query('INSERT INTO ventashay (venta_group, id_usuario, id_servicio_servidor, cantidad, total, fecha_compra, estado) VALUES (?, ?, ?, ?, ?, NOW(), ?)', [ventaGroup, userId, id, cantidad, subtotal, 'completada']);
      } else if (tipo === 'seguridad') {
        const [rows] = await connection.query('SELECT precio, nombre FROM servicios_seguridad WHERE id_servicio = ?', [id]);
        if (!rows.length) throw new Error('Servicio seguridad no encontrado: ' + id);
        const precio = Number(rows[0].precio || 0);
        const subtotal = precio * cantidad;
        totalVenta += subtotal;
        await connection.query('INSERT INTO ventashay (venta_group, id_usuario, id_servicio_seguridad, cantidad, total, fecha_compra, estado) VALUES (?, ?, ?, ?, ?, NOW(), ?)', [ventaGroup, userId, id, cantidad, subtotal, 'completada']);
      } else {
        throw new Error('Tipo de item inválido: ' + tipo);
      }
    }

    // Crear notificación
    await connection.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, NOW(), ?)', [userId, 'Compra realizada correctamente', 0]);

    await connection.commit();
    return res.json({ ok: true, ventaGroup, total: totalVenta });
  } catch (err) {
    console.error('Error POST /api/ventas', err);
    if (connection) await connection.rollback();
    return res.status(500).json({ ok: false, error: err.message || 'Error al procesar compra' });
  } finally {
    if (connection) connection.release();
  }
});

// Admin: ver todas las ventas
app.get('/api/admin/ventas', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.*, p.nombre AS producto_nombre, s.tipo AS servicio_servidor_tipo, ss.nombre AS servicio_seguridad_nombre, u.nombre_usuario AS comprador, u.correoUsuario AS comprador_email
       FROM ventashay v
       LEFT JOIN products_vendidos p ON v.id_producto = p.id_producto
       LEFT JOIN servicios_servidores s ON v.id_servicio_servidor = s.id_servicio
       LEFT JOIN servicios_seguridad ss ON v.id_servicio_seguridad = ss.id_servicio
       LEFT JOIN cuenta_usuario u ON v.id_usuario = u.id_usuarios
       ORDER BY v.fecha_compra DESC`
    );
    return res.json({ ok: true, ventas: rows });
  } catch (err) {
    console.error('Error GET /api/admin/ventas', err);
    return res.status(500).json({ ok: false, error: 'Error al obtener ventas' });
  }
});


// 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});
