#!/bin/bash
# Script de verificación de estabilización - FASE 1

echo "========================================"
echo "🔍 VERIFICACIÓN DE ESTABILIZACIÓN"
echo "========================================"
echo ""

# Verificar archivos creados
echo "📁 ARCHIVOS CREADOS:"
echo "==================="
files_created=(
    "htmls/javascript/login-nuevo.js"
    "htmls/javascript/login-ui.js"
    "htmls/test-auth.html"
)

for file in "${files_created[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "✅ $file ($lines líneas)"
    else
        echo "❌ $file (NO ENCONTRADO)"
    fi
done

echo ""
echo "🚫 ARCHIVOS DESACTIVADOS:"
echo "========================="
files_disabled=(
    "htmls/javascript/login.js.DESACTIVADO"
    "htmls/javascript/sistema-usuarios.js.DESACTIVADO"
    "htmls/javascript/config.js.DESACTIVADO"
)

for file in "${files_disabled[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file (DESACTIVADO)"
    else
        echo "❌ $file (NO ENCONTRADO)"
    fi
done

echo ""
echo "🔧 ARCHIVOS A COMPLETAR (FASE 2):"
echo "=================================="
files_pending=(
    "htmls/perfil.html"
    "htmls/htmlproyecto.html"
    "htmls/chat.html"
    "htmls/notificaciones.html"
    "htmls/admin-dashboard.html"
    "htmls/admin-usuarios.html"
    "htmls/admin-solicitudes.html"
)

for file in "${files_pending[@]}"; do
    if [ -f "$file" ]; then
        echo "⏳ $file (Pendiente de Fase 2)"
    else
        echo "❌ $file (NO ENCONTRADO)"
    fi
done

echo ""
echo "✅ VERIFICACIÓN COMPLETADA"
echo "========================================"
