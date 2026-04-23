export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 🕵️‍♂️ EL DETECTIVE DE TOKENS: Desarmamos tu llave para ver qué rol tiene adentro
const token = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (token.includes('.')) {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log("🚨 ROL REAL DEL TOKEN EN .ENV:", payload.role);
    } catch (e) {
        console.log("🚨 ERROR LEYENDO TOKEN");
    }
}

// Inicializamos el cliente apagando la persistencia de sesión (vital para el backend)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    }
);

// Utilidad: Calcular a cuántos días está el próximo cumpleaños
function calcularDiasFaltantes(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 999;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const cumple = new Date(fechaNacimiento);
    cumple.setFullYear(hoy.getFullYear());
    if (cumple.getTime() < hoy.getTime()) {
        cumple.setFullYear(hoy.getFullYear() + 1);
    }
    return Math.ceil((cumple.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
}

// Utilidad: Encontrar al encargado (el cumpleaños anterior)
function encontrarEncargado(miembros: any[], cumpleaneroId: string) {
    const miembrosOrdenados = miembros
        .map(m => {
            // Normalizamos por si Supabase lo devuelve como array o como objeto
            const u = Array.isArray(m.usuarios) ? m.usuarios[0] : m.usuarios;
            return { ...m, usuarioNormalizado: u };
        })
        .filter(m => m.usuarioNormalizado && m.usuarioNormalizado.fecha_cumpleanos)
        .map(m => {
            const date = new Date(m.usuarioNormalizado.fecha_cumpleanos);
            const mesDia = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return { ...m, mesDia };
        })
        .sort((a, b) => a.mesDia.localeCompare(b.mesDia));

    const indexCumpleanero = miembrosOrdenados.findIndex(m => m.usuario_id === cumpleaneroId);

    if (indexCumpleanero === -1 || miembrosOrdenados.length <= 1) return null;

    const indexAnterior = indexCumpleanero === 0 ? miembrosOrdenados.length - 1 : indexCumpleanero - 1;

    return miembrosOrdenados[indexAnterior].usuarioNormalizado;
}

export async function GET(request: Request) {
    console.log("⚙️ INICIANDO CRON DE NOTIFICACIONES...");

    const { data: grupos, error: errorGrupos } = await supabase
        .from('grupos')
        .select(`
            id, nombre, presupuesto,
            usuarios_grupos (
                usuario_id,
                usuarios ( id, nombre, apellido, telefono, fecha_cumpleanos )
            )
        `);

    if (errorGrupos || !grupos) {
        console.error("Error al buscar grupos", errorGrupos);
        return NextResponse.json({ error: "Error de BD" }, { status: 500 });
    }

    const reportes = [];

    for (const grupo of grupos) {
        const miembros = grupo.usuarios_grupos as any[];

        for (const relacion of miembros) {
            // FIX: Normalizamos el usuario extraído
            const usuarioRaw = relacion.usuarios;
            const usuario = Array.isArray(usuarioRaw) ? usuarioRaw[0] : usuarioRaw;

            // Si el usuario no tiene fecha de cumpleaños, lo saltamos
            if (!usuario || !usuario.fecha_cumpleanos) continue;

            const diasFaltantes = calcularDiasFaltantes(usuario.fecha_cumpleanos);

            if (diasFaltantes > 45) continue;

            let query = supabase.from('regalos').select('*').eq('usuario_id', usuario.id);
            if (grupo.presupuesto) {
                query = query.or(`precio.lte.${grupo.presupuesto},precio.is.null`);
            }
            const { data: regalosValidos } = await query;
            const cantidadRegalos = regalosValidos?.length || 0;

            // ==========================================
            // FASE 1: ALERTA AL CUMPLEAÑERO (<= 45 días)
            // ==========================================
            if (diasFaltantes <= 45 && cantidadRegalos < 3) {
                const mensaje = `🟢 WHATSAPP (FASE 1) -> A: ${usuario.telefono} | Hola ${usuario.nombre}, faltan ${diasFaltantes} días para tu cumple! En el grupo "${grupo.nombre}" tenés solo ${cantidadRegalos} regalos en presupuesto. Cargá mínimo 3 para dejar de recibir este mensaje.`;
                console.log(mensaje);
                reportes.push(mensaje);
            }

            // ==========================================
            // FASE 2: ALERTA AL ENCARGADO (<= 30 días)
            // ==========================================
            if (diasFaltantes <= 30 && cantidadRegalos >= 3) {
                const algunReservado = regalosValidos?.some(r => r.comprador_id !== null);

                if (!algunReservado) {
                    const encargado = encontrarEncargado(miembros, usuario.id);

                    if (encargado && encargado.telefono) {
                        const mensaje = `🔴 WHATSAPP (FASE 2) -> A: ${encargado.telefono} | Hola ${encargado.nombre}, sos el encargado del regalo de ${usuario.nombre} en el grupo "${grupo.nombre}" (Faltan ${diasFaltantes} días). ¡Entrá a la app y reservá un regalo para dejar de recibir este mensaje!`;
                        console.log(mensaje);
                        reportes.push(mensaje);
                    }
                }
            }
        }
    }

    console.log("✅ CRON FINALIZADO");
    return NextResponse.json({
        status: "Ejecución exitosa",
        notificaciones_evaluadas: reportes.length,
        detalle: reportes
    });
}