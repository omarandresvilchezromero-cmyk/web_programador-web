-- Migración: Estructura completa para flujo de Empleados, Consultas y Calificaciones
-- Fecha: 2026-06-12
-- Ejecutar en la base de datos del proyecto (MySQL 8+ recomendado)

DELIMITER $$
DROP PROCEDURE IF EXISTS ensure_empleados_schema$$
CREATE PROCEDURE ensure_empleados_schema()
BEGIN
  -- 1) Crear tabla empleados si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados') THEN
    CREATE TABLE empleados (
      id_empleado INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT NOT NULL,
      especialidad VARCHAR(255),
      experiencia TEXT,
      insignia VARCHAR(128),
      fecha_ingreso DATETIME,
      estado VARCHAR(32) DEFAULT 'Disponible',
      solicitud_id INT NULL,
      UNIQUE KEY ux_empleados_id_usuario (id_usuario),
      INDEX idx_empleados_estado (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  END IF;

  -- 2) Crear perfil_empleado si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'perfil_empleado') THEN
    CREATE TABLE perfil_empleado (
      id INT AUTO_INCREMENT PRIMARY KEY,
      id_empleado INT NOT NULL,
      id_usuario INT NOT NULL,
      especialidad VARCHAR(255),
      experiencia TEXT,
      descripcion TEXT,
      estado VARCHAR(32) DEFAULT 'Disponible',
      fecha_creacion DATETIME,
      INDEX idx_perfil_id_empleado (id_empleado),
      INDEX idx_perfil_id_usuario (id_usuario)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  END IF;

  -- 3) Crear consultas si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consultas') THEN
    CREATE TABLE consultas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT NOT NULL,
      asunto VARCHAR(255),
      descripcion TEXT,
      servicio_tipo VARCHAR(100),
      fecha_creacion DATETIME,
      fecha_atencion DATETIME NULL,
      estado VARCHAR(32) DEFAULT 'pendiente',
      id_empleado_responsable INT NULL,
      INDEX idx_consultas_estado (estado),
      INDEX idx_consultas_empleado (id_empleado_responsable),
      INDEX idx_consultas_fecha (fecha_creacion)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  END IF;

  -- 4) Crear calificaciones_empleado si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones_empleado') THEN
    CREATE TABLE calificaciones_empleado (
      id_calificacion INT AUTO_INCREMENT PRIMARY KEY,
      id_empleado INT NOT NULL,
      id_usuario INT NOT NULL,
      puntuacion TINYINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
      comentario TEXT,
      fecha DATETIME,
      INDEX idx_calificaciones_empleado (id_empleado),
      INDEX idx_calificaciones_usuario (id_usuario)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
  END IF;

  -- 5) Agregar columna id_empleado_responsable a servicios_servidores si no existe
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_servidores')
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_servidores' AND COLUMN_NAME = 'id_empleado_responsable') THEN
    ALTER TABLE servicios_servidores ADD COLUMN id_empleado_responsable INT NULL AFTER id_servicio;
    ALTER TABLE servicios_servidores ADD INDEX idx_servicios_empleado (id_empleado_responsable);
  END IF;

  -- 6) Agregar columna id_empleado_responsable a servicios_seguridad si no existe
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_seguridad')
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_seguridad' AND COLUMN_NAME = 'id_empleado_responsable') THEN
    ALTER TABLE servicios_seguridad ADD COLUMN id_empleado_responsable INT NULL AFTER id_servicio;
    ALTER TABLE servicios_seguridad ADD INDEX idx_serviciosseg_empleado (id_empleado_responsable);
  END IF;

  -- 7) Asegurar índice en solicitudes_empleo.estado para búsquedas rápidas
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_empleo') THEN
    SET @exists = (SELECT COUNT(1) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_empleo' AND INDEX_NAME = 'idx_solicitudes_estado');
    IF @exists = 0 THEN
      ALTER TABLE solicitudes_empleo ADD INDEX idx_solicitudes_estado (estado);
    END IF;
  END IF;

  -- 8) Asegurar FK y relaciones (si las tablas/columnas existen)
  -- FK: empleados.id_usuario -> cuenta_usuario.id_usuarios
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'id_usuario')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cuenta_usuario' AND COLUMN_NAME = 'id_usuarios') THEN
    -- agregar FK si no existe
    SET @cnt = (SELECT COUNT(1) FROM information_schema.REFERENTIAL_CONSTRAINTS rc JOIN information_schema.TABLE_CONSTRAINTS tc ON rc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'empleados' AND rc.REFERENCED_TABLE_NAME = 'cuenta_usuario');
    IF @cnt = 0 THEN
      ALTER TABLE empleados ADD CONSTRAINT fk_empleados_cuenta_usuario FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: empleados.solicitud_id -> solicitudes_empleo.id (si existen columnas)
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'solicitud_id')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_empleo' AND COLUMN_NAME = 'id') THEN
    SET @cnt2 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND REFERENCED_TABLE_NAME = 'solicitudes_empleo');
    IF @cnt2 = 0 THEN
      ALTER TABLE empleados ADD CONSTRAINT fk_empleados_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes_empleo(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: perfil_empleado.id_empleado -> empleados.id_empleado
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'perfil_empleado' AND COLUMN_NAME = 'id_empleado')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'id_empleado') THEN
    SET @cnt3 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'perfil_empleado' AND REFERENCED_TABLE_NAME = 'empleados');
    IF @cnt3 = 0 THEN
      ALTER TABLE perfil_empleado ADD CONSTRAINT fk_perfil_empleado_empleado FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: perfil_empleado.id_usuario -> cuenta_usuario.id_usuarios
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'perfil_empleado' AND COLUMN_NAME = 'id_usuario')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cuenta_usuario' AND COLUMN_NAME = 'id_usuarios') THEN
    SET @cnt4 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'perfil_empleado' AND REFERENCED_TABLE_NAME = 'cuenta_usuario');
    IF @cnt4 = 0 THEN
      ALTER TABLE perfil_empleado ADD CONSTRAINT fk_perfil_empleado_usuario FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: consultas.id_usuario -> cuenta_usuario.id_usuarios
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consultas' AND COLUMN_NAME = 'id_usuario')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cuenta_usuario' AND COLUMN_NAME = 'id_usuarios') THEN
    SET @cnt5 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consultas' AND REFERENCED_TABLE_NAME = 'cuenta_usuario');
    IF @cnt5 = 0 THEN
      ALTER TABLE consultas ADD CONSTRAINT fk_consultas_usuario FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: consultas.id_empleado_responsable -> empleados.id_empleado
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consultas' AND COLUMN_NAME = 'id_empleado_responsable')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'id_empleado') THEN
    SET @cnt6 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consultas' AND REFERENCED_TABLE_NAME = 'empleados');
    IF @cnt6 = 0 THEN
      ALTER TABLE consultas ADD CONSTRAINT fk_consultas_empleado FOREIGN KEY (id_empleado_responsable) REFERENCES empleados(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: calificaciones_empleado.id_empleado -> empleados.id_empleado
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones_empleado' AND COLUMN_NAME = 'id_empleado')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'id_empleado') THEN
    SET @cnt7 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones_empleado' AND REFERENCED_TABLE_NAME = 'empleados');
    IF @cnt7 = 0 THEN
      ALTER TABLE calificaciones_empleado ADD CONSTRAINT fk_calificaciones_empleado FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: calificaciones_empleado.id_usuario -> cuenta_usuario.id_usuarios
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones_empleado' AND COLUMN_NAME = 'id_usuario')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cuenta_usuario' AND COLUMN_NAME = 'id_usuarios') THEN
    SET @cnt8 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones_empleado' AND REFERENCED_TABLE_NAME = 'cuenta_usuario');
    IF @cnt8 = 0 THEN
      ALTER TABLE calificaciones_empleado ADD CONSTRAINT fk_calificaciones_usuario FOREIGN KEY (id_usuario) REFERENCES cuenta_usuario(id_usuarios) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: servicios_servidores.id_empleado_responsable -> empleados.id_empleado
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_servidores' AND COLUMN_NAME = 'id_empleado_responsable')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'id_empleado') THEN
    SET @cnt9 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_servidores' AND REFERENCED_TABLE_NAME = 'empleados');
    IF @cnt9 = 0 THEN
      ALTER TABLE servicios_servidores ADD CONSTRAINT fk_serviciosser_empleado FOREIGN KEY (id_empleado_responsable) REFERENCES empleados(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;

  -- FK: servicios_seguridad.id_empleado_responsable -> empleados.id_empleado
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_seguridad' AND COLUMN_NAME = 'id_empleado_responsable')
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'id_empleado') THEN
    SET @cnt10 = (SELECT COUNT(1) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_seguridad' AND REFERENCED_TABLE_NAME = 'empleados');
    IF @cnt10 = 0 THEN
      ALTER TABLE servicios_seguridad ADD CONSTRAINT fk_serviciosseg_empleado FOREIGN KEY (id_empleado_responsable) REFERENCES empleados(id_empleado) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;

END$$
DELIMITER ;

-- Ejecutar la rutina
CALL ensure_empleados_schema();
-- Limpiar
DROP PROCEDURE IF EXISTS ensure_empleados_schema;

-- Notas: Si alguna instrucción falla por incompatibilidad de nombres de columnas
-- revise los nombres reales en su BD (ej: cuenta_usuario.id_usuarios, solicitudes_empleo.id).
-- Después de ejecutar, compruebe con SHOW TABLES y DESCRIBE <tabla>.

-- Índices adicionales (adicional si quieres ejecutar manualmente):
-- CREATE INDEX idx_consultas_estado_fecha ON consultas (estado, fecha_creacion);
-- CREATE INDEX idx_empleados_estado_ingreso ON empleados (estado, fecha_ingreso);
-- CREATE INDEX idx_solicitudes_estado_fecha ON solicitudes_empleo (estado, fecha_solicitud);

-- FIN de migración
