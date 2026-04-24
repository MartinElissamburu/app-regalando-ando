export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// NUEVA FUNCIÓN: El puente entre Next.js (Vercel) y tu Bot de Node (Render)
async function dispararWhatsApp(telefono: string, mensaje: string) {
    try {
        // Usamos las variables de entorno para que sea dinámico y seguro
        const BOT_URL = process.env.WHATSAPP_BOT_URL!;
        const API_KEY = process.env.WHATSAPP_BOT_KEY!;

        const response = await fetch(BOT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: API_KEY,
                telefono: telefono,
                mensaje: mensaje
            })
        });

        const data = await response.json();
        console.log(`📡 Respuesta del Bot para ${telefono}:`, data);
    } catch (error) {
        console.error(`🚨 Falló la conexión con el Bot para ${telefono}:`, error);
    }
}

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

function encontrarEncargado(miembros: any[], cumpleaneroId: string) {
    const miembrosOrdenados = miembros
        .map(m => {
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
    // --- 🛡️ ESCUDO DE SEGURIDAD DE VERCEL ---
    // Esto evita que cualquiera que descubra tu URL pueda ejecutar la tarea
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn("🚫 Intento de acceso no autorizado al Cron Job");
        return new Response('No autorizado', { status: 401 });
    }
    // ----------------------------------------

    console.log("⚙️ INICIANDO CRON DE NOTIFICACIONES...");

    const { data: grupos, error: errorGrupos } = await supabase
        .from('grupos')
        .select(`id, nombre, presupuesto, usuarios_grupos ( usuario_id, usuarios ( id, nombre, apellido, telefono, fecha_cumpleanos ) )`);

    if (errorGrupos || !grupos) return NextResponse.json({ error: "Error de BD" }, { status: 500 });

    const reportes = [];

    for (const grupo of grupos) {
        const miembros = grupo.usuarios_grupos as any[];

        for (const relacion of miembros) {
            const usuarioRaw = relacion.usuarios;
            const usuario = Array.isArray(usuarioRaw) ? usuarioRaw[0] : usuarioRaw;

            if (!usuario || !usuario.fecha_cumpleanos) continue;
            const diasFaltantes = calcularDiasFaltantes(usuario.fecha_cumpleanos);
            if (diasFaltantes > 45) continue;

            let query = supabase.from('regalos').select('*').eq('usuario_id', usuario.id);
            if (grupo.presupuesto) query = query.or(`precio.lte.${grupo.presupuesto},precio.is.null`);
            const { data: regalosValidos } = await query;
            const cantidadRegalos = regalosValidos?.length || 0;

            // FASE 1
            if (diasFaltantes <= 45 && cantidadRegalos < 3) {
                const mensaje = `Hola ${usuario.nombre}, faltan ${diasFaltantes} días para tu cumple! En el grupo "${grupo.nombre}" tenés solo ${cantidadRegalos} regalos en presupuesto. Cargá mínimo 3 en RegalandoAndo para dejar de recibir este mensaje.`;

                reportes.push(`Enviando FASE 1 a ${usuario.telefono}`);
                await dispararWhatsApp(usuario.telefono, mensaje);
            }

            // FASE 2
            if (diasFaltantes <= 30 && cantidadRegalos >= 3) {
                const algunReservado = regalosValidos?.some(r => r.comprador_id !== null);

                if (!algunReservado) {
                    const encargado = encontrarEncargado(miembros, usuario.id);
                    if (encargado && encargado.telefono) {
                        const mensaje = `Hola ${encargado.nombre}, sos el encargado del regalo de ${usuario.nombre} en el grupo "${grupo.nombre}" (Faltan ${diasFaltantes} días). ¡Entrá a la app y reservá un regalo para dejar de recibir este mensaje!`;

                        reportes.push(`Enviando FASE 2 a ${encargado.telefono}`);
                        await dispararWhatsApp(encargado.telefono, mensaje);
                    }
                }
            }
        }
    }

    console.log("✅ CRON FINALIZADO");
    return NextResponse.json({ status: "Ejecución exitosa", detalle: reportes });
}