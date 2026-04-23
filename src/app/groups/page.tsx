"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Key, LogOut, ArrowRight, Loader2, Gift, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";

interface Grupo {
    id: string;
    nombre: string;
    descripcion: string;
    presupuesto: number;
    codigo_union: string;
    creador_id: string; // Nueva columna
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function GruposPage() {
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [openCreate, setOpenCreate] = useState(false);
    const [openJoin, setOpenJoin] = useState(false);
    const [openEdit, setOpenEdit] = useState(false); // Modal de edición

    const [formCreate, setFormCreate] = useState({ nombre: "", descripcion: "", presupuesto: "" });
    const [formEdit, setFormEdit] = useState({ id: "", nombre: "", descripcion: "", presupuesto: "" });
    const [joinCode, setJoinCode] = useState("");

    const router = useRouter();

    useEffect(() => {
        const checkSessionAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
            } else {
                setUser(session.user);
                await fetchMisGrupos(session.user.id);
                setLoading(false);
            }
        };
        checkSessionAndFetch();
    }, [router]);

    const fetchMisGrupos = async (userId: string) => {
        const { data, error } = await supabase
            .from('grupos')
            .select('*, usuarios_grupos!inner(usuario_id)')
            .eq('usuarios_grupos.usuario_id', userId)
            .order('id', { ascending: false });

        if (data && !error) {
            setGrupos(data);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    // CREAR GRUPO
    const handleCreateGroup = async () => {
        if (!formCreate.nombre.trim() || !user) return;

        let codigoGenerado = "";
        let esCodigoUnico = false;

        // Bucle que busca un código hasta encontrar uno que no exista
        while (!esCodigoUnico) {
            codigoGenerado = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Le preguntamos a Supabase si este código ya está en uso
            const { data } = await supabase
                .from('grupos')
                .select('id')
                .eq('codigo_union', codigoGenerado)
                .single();

            // Si data es null, significa que no encontró a nadie con ese código. ¡Es único!
            if (!data) {
                esCodigoUnico = true;
            }
        }

        const nuevoGrupo = {
            nombre: formCreate.nombre.trim(),
            descripcion: formCreate.descripcion.trim() || null,
            presupuesto: formCreate.presupuesto ? parseFloat(formCreate.presupuesto) : null,
            codigo_union: codigoGenerado,
            creador_id: user.id
        };

        const { data: grupoCreado, error: errorGrupo } = await supabase
            .from('grupos')
            .insert([nuevoGrupo])
            .select()
            .single();

        if (errorGrupo) {
            alert("Error al crear el grupo.");
            return;
        }

        const { error: errorUnion } = await supabase
            .from('usuarios_grupos')
            .insert([{ usuario_id: user.id, grupo_id: grupoCreado.id }]);

        if (!errorUnion) {
            setGrupos((prev) => [grupoCreado, ...prev]);
            setOpenCreate(false);
            setFormCreate({ nombre: "", descripcion: "", presupuesto: "" });
        }
    };

    // UNIRSE A GRUPO
    const handleJoinGroup = async () => {
        if (!joinCode.trim() || !user) return;

        const { data: grupoEncontrado, error: errorBusqueda } = await supabase
            .from('grupos')
            .select('*')
            .eq('codigo_union', joinCode.trim().toUpperCase())
            .single();

        if (errorBusqueda || !grupoEncontrado) {
            alert("Código inválido o el grupo no existe.");
            return;
        }

        const { error: errorUnion } = await supabase
            .from('usuarios_grupos')
            .insert([{ usuario_id: user.id, grupo_id: grupoEncontrado.id }]);

        if (errorUnion) {
            alert("Ya perteneces a este grupo o hubo un error.");
        } else {
            setGrupos((prev) => [grupoEncontrado, ...prev]);
            setOpenJoin(false);
            setJoinCode("");
        }
    };

    // EDITAR GRUPO (Solo dueño)
    const handleOpenEdit = (grupo: Grupo) => {
        setFormEdit({
            id: grupo.id,
            nombre: grupo.nombre,
            descripcion: grupo.descripcion || "",
            presupuesto: grupo.presupuesto ? grupo.presupuesto.toString() : ""
        });
        setOpenEdit(true);
    };

    const handleSaveEdit = async () => {
        if (!formEdit.nombre.trim()) return;

        const { data, error } = await supabase
            .from('grupos')
            .update({
                nombre: formEdit.nombre.trim(),
                descripcion: formEdit.descripcion.trim() || null,
                presupuesto: formEdit.presupuesto ? parseFloat(formEdit.presupuesto) : null,
            })
            .eq('id', formEdit.id)
            .select()
            .single();

        if (!error && data) {
            setGrupos((prev) => prev.map((g) => (g.id === formEdit.id ? data : g)));
            setOpenEdit(false);
        } else {
            alert("Error al actualizar el grupo.");
        }
    };

    // BORRAR GRUPO (Solo dueño)
    const handleDeleteGroup = async (id: string) => {
        if (!window.confirm("¿Seguro que querés eliminar el grupo? Esto borrará el grupo para todos los miembros.")) return;

        const { error } = await supabase
            .from('grupos')
            .delete()
            .eq('id', id);

        if (!error) {
            setGrupos((prev) => prev.filter((g) => g.id !== id));
        } else {
            alert("Error al borrar el grupo.");
        }
    };

    // ABANDONAR GRUPO (Miembros)
    const handleLeaveGroup = async (grupoId: string) => {
        if (!window.confirm("¿Seguro que querés abandonar este grupo? Tendrás que pedir el código para volver a entrar.")) return;

        const { error } = await supabase
            .from('usuarios_grupos')
            .delete()
            .eq('grupo_id', grupoId)
            .eq('usuario_id', user.id);

        if (!error) {
            setGrupos((prev) => prev.filter((g) => g.id !== grupoId));
        } else {
            alert("Error al abandonar el grupo.");
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Cargando tus grupos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navigation />

            <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 pb-24">
                <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                            Mis Grupos
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Compartí tus regalos con las personas correctas.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Dialog open={openJoin} onOpenChange={setOpenJoin}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="gap-2">
                                    <Key className="h-4 w-4" />
                                    Unirse
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground">Unirse a un Grupo</DialogTitle>
                                    <DialogDescription className="text-muted-foreground">
                                        Ingresá el código de 6 letras que te pasó tu amigo.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-5 pt-4">
                                    <Input
                                        placeholder="Ej. A7X9BC"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        className="text-center text-xl tracking-widest uppercase bg-input"
                                        maxLength={6}
                                    />
                                    <Button onClick={handleJoinGroup} className="w-full">Entrar al Grupo</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Crear Grupo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground">Crear Nuevo Grupo</DialogTitle>
                                    <DialogDescription className="sr-only">Formulario para crear grupo</DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-5 pt-4">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="grupo-nombre" className="text-foreground">Nombre del Grupo *</Label>
                                        <Input id="grupo-nombre" value={formCreate.nombre} onChange={(e) => setFormCreate({ ...formCreate, nombre: e.target.value })} className="bg-input" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="grupo-desc" className="text-foreground">Descripción (Opcional)</Label>
                                        <Input id="grupo-desc" value={formCreate.descripcion} onChange={(e) => setFormCreate({ ...formCreate, descripcion: e.target.value })} className="bg-input" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="grupo-presupuesto" className="text-foreground">Tope de Presupuesto (Opcional)</Label>
                                        <Input id="grupo-presupuesto" type="number" value={formCreate.presupuesto} onChange={(e) => setFormCreate({ ...formCreate, presupuesto: e.target.value })} className="bg-input" />
                                    </div>
                                    <Button onClick={handleCreateGroup} className="w-full">Generar Grupo</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Modal oculto para EDITAR (reutiliza el mismo diseño) */}
                        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground">Editar Grupo</DialogTitle>
                                    <DialogDescription className="sr-only">Formulario para editar grupo</DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-5 pt-4">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="edit-nombre" className="text-foreground">Nombre del Grupo *</Label>
                                        <Input id="edit-nombre" value={formEdit.nombre} onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })} className="bg-input" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="edit-desc" className="text-foreground">Descripción (Opcional)</Label>
                                        <Input id="edit-desc" value={formEdit.descripcion} onChange={(e) => setFormEdit({ ...formEdit, descripcion: e.target.value })} className="bg-input" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="edit-presupuesto" className="text-foreground">Tope de Presupuesto (Opcional)</Label>
                                        <Input id="edit-presupuesto" type="number" value={formEdit.presupuesto} onChange={(e) => setFormEdit({ ...formEdit, presupuesto: e.target.value })} className="bg-input" />
                                    </div>
                                    <Button onClick={handleSaveEdit} className="w-full">Guardar Cambios</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                    </div>
                </div>

                {grupos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-24 text-center">
                        <Users className="mb-4 h-10 w-10 text-muted-foreground" />
                        <p className="text-lg font-medium text-foreground">Aún no tenés grupos</p>
                        <p className="mt-1 text-sm text-muted-foreground">Podés crear uno nuevo o unirte con el código de un amigo.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {grupos.map((grupo) => {
                            const isOwner = grupo.creador_id === user.id;

                            return (
                                <Card key={grupo.id} className="flex flex-col border-border bg-card text-card-foreground">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-xl font-bold pr-2">{grupo.nombre}</CardTitle>

                                            {/* BOTONERA DINÁMICA: Depende si sos dueño o miembro */}
                                            <div className="flex gap-1 shrink-0">
                                                {isOwner ? (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-secondary" onClick={() => handleOpenEdit(grupo)} title="Editar Grupo">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteGroup(grupo.id)} title="Eliminar Grupo">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleLeaveGroup(grupo.id)} title="Abandonar Grupo">
                                                        <LogOut className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2">
                                            <span className="text-xs font-medium px-2 py-1 bg-secondary text-secondary-foreground rounded-md w-fit">
                                                Código: {grupo.codigo_union}
                                            </span>
                                            {grupo.presupuesto && grupo.presupuesto > 0 && (
                                                <span className="text-xs font-medium text-emerald-500 w-fit">
                                                    Tope: {formatCurrency(grupo.presupuesto)}
                                                </span>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="flex-1">
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {grupo.descripcion || "Sin descripción."}
                                        </p>
                                    </CardContent>

                                    <CardFooter className="pt-4 border-t border-border">
                                        <Button className="w-full gap-2" variant="outline" asChild>
                                            <Link href={`/groups/${grupo.id}`}>
                                                Ver Grupo <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}