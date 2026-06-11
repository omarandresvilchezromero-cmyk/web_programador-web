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
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'No autorizado' });
}

// Crear solicitud de empleo
app.post('/api/solicitudes', requireAuth, async (req, res) => {
  const { especialidad, experiencia, descripcion } = req.body;
  const id_usuario = req.session.user.id;
  const fecha_solicitud = new Date();
  const estado = 'pendiente';

  try {
    const [result] = await pool.query(
      'INSERT INTO solicitudes_empleo (id_usuario, especialidad, experiencia, descripcion, fecha_solicitud, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [id_usuario, especialidad, experiencia, descripcion, fecha_solicitud, estado]
    );

    // TODO: crear notificación para admin

    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar solicitud' });
  }
});

// Obtener solicitudes (solo admin)
app.get('/api/admin/solicitudes', requireAuth, async (req, res) => {
  const role = (req.session.user.rol || '').toString().toLowerCase();
  if (!(role === 'admin' || role === 'administrador')) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.query('SELECT * FROM solicitudes_empleo ORDER BY fecha_solicitud DESC');
    res.json(rows);
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
    const [empleadoRows] = await pool.query('SELECT * FROM empleados WHERE id_usuarios = ? LIMIT 1', [user.id]);

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
  const { action, razonRechazo, insignia } = req.body;
  const fecha = new Date();

  try {
    const [solicitudes] = await pool.query('SELECT * FROM solicitudes_empleo WHERE id = ?', [solicitudId]);
    if (!solicitudes.length) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const solicitud = solicitudes[0];
    if (action === 'approve') {
      const estado = 'aprobada';
      await pool.query('UPDATE solicitudes_empleo SET estado = ? WHERE id = ?', [estado, solicitudId]);
      await pool.query('UPDATE cuenta_usuario SET rol = ? WHERE id_usuarios = ?', ['Empleado', solicitud.id_usuario]);
      await pool.query('INSERT INTO empleados (id_usuario, especialidad, experiencia, insignia, fecha_ingreso, estado, solicitud_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        solicitud.id_usuario,
        solicitud.especialidad,
        solicitud.experiencia,
        insignia || 'empleado-verificado',
        fecha,
        'activo',
        solicitud.id
      ]);
      await pool.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, ?, ?)', [
        solicitud.id_usuario,
        'Tu solicitud de empleo fue aprobada y ahora eres empleado.',
        fecha,
        0
      ]);
      return res.json({ ok: true, message: 'Solicitud aprobada y empleado creado' });
    }

    if (action === 'reject') {
      const estado = 'rechazada';
      await pool.query('UPDATE solicitudes_empleo SET estado = ?, descripcion = ? WHERE id = ?', [estado, razonRechazo || null, solicitudId]);
      await pool.query('INSERT INTO notificaciones (id_usuario, mensaje, fecha_notificacion, leida) VALUES (?, ?, ?, ?)', [
        solicitud.id_usuario,
        `Tu solicitud de empleo fue rechazada. ${razonRechazo || ''}`,
        fecha,
        0
      ]);
      return res.json({ ok: true, message: 'Solicitud rechazada' });
    }

    res.status(400).json({ error: 'Acción inválida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar solicitud' });
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
      console.log('RESPUESTA ENVIADA:', { ok: true, mensajes: rows.length });
      return res.json({ ok: true, mensajes: rows });
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
    res.json({ ok: true, mensajes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
});

app.post('/api/mensajes', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { destinatario, mensaje } = req.body;
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
      
    ]);

      console.log('RESPUESTA ENVIADA:', { ok: true, id: result.insertId });
      return res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});
