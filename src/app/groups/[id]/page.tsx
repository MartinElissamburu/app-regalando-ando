"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Cake, Gift, ExternalLink, Loader2, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";

interface Grupo {
    id: string;
    nombre: string;
    presupuesto: number | null;
}

interface Miembro {
    id: string;
    nombre: string;
    apellido: string;
    fecha_cumpleanos: string;
    proximo_cumple_dias: number;
}

interface Regalo {
    id: string;
    titulo: string;
    precio?: number;
    link?: string;
    talle?: string;
    comprador_id?: string | null; // <--- Agregamos la nueva columna
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(amount);
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

    const diferenciaTiempo = cumple.getTime() - hoy.getTime();
    return Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));
}

export default function VerGrupoPage() {
    const params = useParams();
    const router = useRouter();
    const grupoId = params.id as string;

    const [userAuth, setUserAuth] = useState<any>(null); // <--- Necesitamos saber quién soy yo
    const [grupo, setGrupo] = useState<Grupo | null>(null);
    const [miembros, setMiembros] = useState<Miembro[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMember, setSelectedMember] = useState<Miembro | null>(null);
    const [regalos, setRegalos] = useState<Regalo[]>([]);
    const [loadingRegalos, setLoadingRegalos] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    useEffect(() => {
        const fetchDatosGrupo = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            setUserAuth(session.user);

            const { data: dataGrupo, error: errorGrupo } = await supabase
                .from('grupos')
                .select('id, nombre, presupuesto')
                .eq('id', grupoId)
                .single();

            if (errorGrupo || !dataGrupo) {
                alert("No se pudo cargar el grupo.");
                router.push("/groups");
                return;
            }
            setGrupo(dataGrupo);

            const { data: dataMiembros, error: errorMiembros } = await supabase
                .from('usuarios_grupos')
                .select(`
                    usuario_id,
                    usuarios ( id, nombre, apellido, fecha_cumpleanos )
                `)
                .eq('grupo_id', grupoId);

            if (!errorMiembros && dataMiembros) {
                const miembrosMapeados: Miembro[] = dataMiembros
                    .map((item: any) => ({
                        id: item.usuarios.id,
                        nombre: item.usuarios.nombre,
                        apellido: item.usuarios.apellido,
                        fecha_cumpleanos: item.usuarios.fecha_cumpleanos,
                        proximo_cumple_dias: calcularDiasFaltantes(item.usuarios.fecha_cumpleanos)
                    }))
                    .sort((a, b) => a.proximo_cumple_dias - b.proximo_cumple_dias);

                setMiembros(miembrosMapeados);
            }
            setLoading(false);
        };

        if (grupoId) fetchDatosGrupo();
    }, [grupoId, router]);

    const handleVerRegalos = async (miembro: Miembro) => {
        setSelectedMember(miembro);
        setOpenModal(true);
        setLoadingRegalos(true);

        let query = supabase
            .from('regalos')
            .select('*')
            .eq('usuario_id', miembro.id)
            .order('id', { ascending: false });

        if (grupo && grupo.presupuesto) {
            query = query.or(`precio.lte.${grupo.presupuesto},precio.is.null`);
        }

        const { data, error } = await query;

        if (!error && data) {
            setRegalos(data);
        } else {
            setRegalos([]);
        }
        setLoadingRegalos(false);
    };

    // FUNCION MAGICA: Reservar o Cancelar Reserva (Con prevención de concurrencia)
    const handleToggleReserva = async (regaloId: string, currentComprador: string | null) => {
        if (!userAuth) return;

        const isCancelling = currentComprador !== null;
        const nuevoComprador = isCancelling ? null : userAuth.id;

        // Armamos la consulta base
        let query = supabase
            .from('regalos')
            .update({ comprador_id: nuevoComprador })
            .eq('id', regaloId);

        // EL TRUCO ANTI-CONCURRENCIA: 
        if (isCancelling) {
            // Si quiero cancelar, me aseguro de que yo SIGA SIENDO el dueño de la reserva
            query = query.eq('comprador_id', userAuth.id);
        } else {
            // Si quiero reservar, me aseguro de que SIGA ESTANDO libre (null)
            query = query.is('comprador_id', null);
        }

        // Agregamos .select() al final para que nos devuelva el registro modificado
        const { data, error } = await query.select();

        if (error) {
            alert("Hubo un error al comunicarse con la base de datos.");
            return;
        }

        // Si 'data' viene vacío, significa que nuestra condición falló (alguien se adelantó)
        if (!data || data.length === 0) {
            alert("⚠️ Regalo ya reservado o modificado por otra persona. Por favor, recargá la página o volvé a abrir la lista.");
            return; // Cortamos la ejecución acá para que no pinte el botón de verde
        }

        // Si pasamos el filtro, actualizamos la pantalla en tiempo real
        setRegalos((prev) =>
            prev.map(r => r.id === regaloId ? { ...r, comprador_id: nuevoComprador } : r)
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Cargando información del grupo...</p>
            </div>
        );
    }

    // Saber si la lista que abrí es la mía propia
    const isOwnList = selectedMember?.id === userAuth?.id;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navigation />

            <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 pb-24">
                <div className="mb-6">
                    <Button variant="ghost" size="sm" className="gap-2 -ml-3 text-muted-foreground hover:text-foreground" asChild>
                        <Link href="/groups">
                            <ArrowLeft className="h-4 w-4" /> Volver a Grupos
                        </Link>
                    </Button>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        {grupo?.nombre}
                    </h1>
                    {grupo?.presupuesto && (
                        <p className="mt-2 inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-sm font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                            Presupuesto Máximo: {formatCurrency(grupo.presupuesto)}
                        </p>
                    )}
                </div>

                <h2 className="text-xl font-semibold mb-4 border-b border-border pb-2">Integrantes y Próximos Cumpleaños</h2>

                <div className="flex flex-col gap-3">
                    {miembros.map((miembro, index) => {
                        const esTop3 = index < 3 && miembro.proximo_cumple_dias !== 999;
                        const soyYo = miembro.id === userAuth?.id;

                        return (
                            <Card
                                key={miembro.id}
                                className={`transition-colors hover:bg-secondary/50 cursor-pointer 
                                    ${esTop3 ? 'border-primary/50 bg-primary/5' : ''} 
                                    ${soyYo ? 'border-l-4 border-l-primary' : ''}`}
                                onClick={() => handleVerRegalos(miembro)}
                            >
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-lg flex items-center gap-2">
                                            {miembro.nombre} {miembro.apellido}
                                            {soyYo && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">Vos</span>}
                                        </span>
                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                            <Cake className={`h-4 w-4 ${esTop3 ? 'text-primary' : ''}`} />
                                            {miembro.proximo_cumple_dias === 0 ? "¡Es su cumpleaños hoy! 🎉" :
                                                miembro.proximo_cumple_dias === 999 ? "Fecha no registrada" :
                                                    `Faltan ${miembro.proximo_cumple_dias} días`}
                                        </span>
                                    </div>
                                    <Button variant="secondary" size="sm">Ver Lista</Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Modal de Regalos */}
                <Dialog open={openModal} onOpenChange={setOpenModal}>
                    <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl flex items-center gap-2">
                                <Gift className="h-5 w-5 text-primary" />
                                Lista de {selectedMember?.nombre}
                            </DialogTitle>
                            <DialogDescription>
                                {isOwnList
                                    ? "Para mantener la sorpresa, no podés ver si tus amigos reservaron tus regalos 🤫"
                                    : grupo?.presupuesto
                                        ? `Mostrando regalos que entran en el presupuesto del grupo (${formatCurrency(grupo.presupuesto)}).`
                                        : "Acá podés ver y reservar los regalos que quiere tu amigo."}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="pt-2 flex flex-col gap-4">
                            {loadingRegalos ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : regalos.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-lg">
                                    <p>La lista está vacía o no hay regalos que se ajusten al presupuesto.</p>
                                </div>
                            ) : (
                                regalos.map((regalo) => {
                                    // Lógica de visualización de botones
                                    const isReservadoPorMi = regalo.comprador_id === userAuth?.id;
                                    const isReservadoPorOtro = regalo.comprador_id && regalo.comprador_id !== userAuth?.id;

                                    return (
                                        <div key={regalo.id} className={`flex flex-col gap-2 p-4 rounded-lg border bg-card transition-colors ${isReservadoPorMi ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border'}`}>
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-foreground">{regalo.titulo}</h3>
                                                {regalo.precio && (
                                                    <span className="font-bold text-primary">{formatCurrency(regalo.precio)}</span>
                                                )}
                                            </div>

                                            {regalo.talle && (
                                                <p className="text-sm text-muted-foreground">Talle/Detalle: {regalo.talle}</p>
                                            )}

                                            {regalo.link && (
                                                <Button variant="link" className="h-auto p-0 justify-start w-fit gap-1 text-sm mt-1" asChild>
                                                    <a href={regalo.link} target="_blank" rel="noopener noreferrer">
                                                        Ver producto en la tienda <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </Button>
                                            )}

                                            {/* BOTONERA DE RESERVAS (Se oculta si es tu propia lista) */}
                                            {!isOwnList && (
                                                <div className="mt-3 border-t border-border pt-3">
                                                    {isReservadoPorOtro ? (
                                                        <Button disabled variant="secondary" className="w-full gap-2 opacity-60">
                                                            <Lock className="h-4 w-4" /> Ya reservado por otro integrante
                                                        </Button>
                                                    ) : isReservadoPorMi ? (
                                                        <Button
                                                            variant="default"
                                                            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                                            onClick={() => handleToggleReserva(regalo.id, regalo.comprador_id || null)}
                                                        >
                                                            <CheckCircle className="h-4 w-4" /> Reservado por vos (Clic para cancelar)
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                                                            onClick={() => handleToggleReserva(regalo.id, null)}
                                                        >
                                                            <Gift className="h-4 w-4" /> Reservar este regalo
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}