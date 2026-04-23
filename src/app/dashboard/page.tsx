"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Gift, Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription, // Agregado para arreglar el warning
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";

interface GiftItem {
    id: string;
    titulo: string;
    link?: string;
    precio?: number;
    talle?: string;
}

function formatCurrency(amount?: number | null): string {
    if (amount === undefined || amount === null) return "Precio a confirmar";

    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function Dashboard() {
    const [gifts, setGifts] = useState<GiftItem[]>([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: "", link: "", price: "", size: "" });

    // NUEVO: Estado para saber si estamos editando (guarda el ID) o creando (null)
    const [editingId, setEditingId] = useState<string | null>(null);

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkSessionAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push("/login");
            } else {
                setUser(session.user);
                await fetchGifts(session.user.id);
                setLoading(false);
            }
        };
        checkSessionAndFetch();
    }, [router]);

    const fetchGifts = async (userId: string) => {
        const { data, error } = await supabase
            .from('regalos')
            .select('*')
            .eq('usuario_id', userId)
            .order('id', { ascending: false });

        if (data && !error) {
            setGifts(data);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    // NUEVO: Función para abrir el modal en modo "Agregar" (Limpio)
    const handleOpenAdd = () => {
        setForm({ name: "", link: "", price: "", size: "" });
        setEditingId(null);
        setOpen(true);
    };

    // NUEVO: Función para abrir el modal en modo "Editar" (Con datos)
    const handleOpenEdit = (gift: GiftItem) => {
        setForm({
            name: gift.titulo,
            link: gift.link || "",
            price: gift.precio ? gift.precio.toString() : "",
            size: gift.talle || "",
        });
        setEditingId(gift.id);
        setOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !user) return;

        const giftData = {
            usuario_id: user.id,
            titulo: form.name.trim(),
            link: form.link.trim() || null,
            talle: form.size.trim() || null,
            precio: form.price ? parseFloat(form.price) : null,
        };

        if (editingId) {
            // MODO EDICIÓN: Hacemos un UPDATE
            const { data, error } = await supabase
                .from('regalos')
                .update(giftData)
                .eq('id', editingId)
                .select()
                .single();

            if (!error && data) {
                // Actualizamos la tarjeta específica en la pantalla
                setGifts((prev) => prev.map((g) => (g.id === editingId ? data : g)));
                setOpen(false);
                setEditingId(null);
            } else {
                console.error("Error al actualizar:", error);
                alert("Hubo un error al actualizar el regalo.");
            }
        } else {
            // MODO CREACIÓN: Hacemos un INSERT
            const { data, error } = await supabase
                .from('regalos')
                .insert([giftData])
                .select()
                .single();

            if (!error && data) {
                setGifts((prev) => [data, ...prev]);
                setOpen(false);
            } else {
                console.error("Error al guardar:", error);
                alert("Hubo un error al guardar el regalo.");
            }
        }
    };

    const handleDelete = async (id: string) => {
        // Pequeña confirmación antes de borrar para evitar clics accidentales
        if (!window.confirm("¿Estás seguro de que querés eliminar este regalo?")) return;

        const { error } = await supabase
            .from('regalos')
            .delete()
            .eq('id', id);

        if (!error) {
            setGifts((prev) => prev.filter((g) => g.id !== id));
        } else {
            console.error("Error al borrar:", error);
            alert("No se pudo borrar el regalo.");
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Cargando tu lista...</p>
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
                            Mi Lista de Regalos
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {gifts.length} {gifts.length === 1 ? "ítem" : "ítems"} en tu lista
                        </p>
                    </div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <Button size="default" className="gap-2 self-start sm:self-auto" onClick={handleOpenAdd}>
                            <Plus className="h-4 w-4" />
                            Agregar Regalo
                        </Button>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                {/* Título dinámico */}
                                <DialogTitle className="text-foreground">
                                    {editingId ? "Editar Regalo" : "Agregar Nuevo Regalo"}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    Completa el formulario para guardar los datos del regalo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-5 pt-2">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="gift-name" className="text-foreground">
                                        Nombre del Regalo <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="gift-name"
                                        placeholder="Ej. Sony WH-1000XM5, Perfume..."
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        className="bg-input text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="gift-link" className="text-foreground">
                                        Link / URL <span className="text-muted-foreground text-xs font-normal">(Opcional)</span>
                                    </Label>
                                    <Input
                                        id="gift-link"
                                        type="url"
                                        placeholder="https://..."
                                        value={form.link}
                                        onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                                        className="bg-input text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="gift-size" className="text-foreground">
                                        Talle / Variedad <span className="text-muted-foreground text-xs font-normal">(Opcional)</span>
                                    </Label>
                                    <Input
                                        id="gift-size"
                                        placeholder="Ej. M, 42, 100ml, Color Negro..."
                                        value={form.size}
                                        onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                                        className="bg-input text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="gift-price" className="text-foreground">
                                        Precio Estimado <span className="text-muted-foreground text-xs font-normal">(Opcional)</span>
                                    </Label>
                                    <Input
                                        id="gift-price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={form.price}
                                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                        className="bg-input text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <Button onClick={handleSave} className="w-full">
                                    {/* Botón dinámico */}
                                    {editingId ? "Guardar Cambios" : "Guardar Regalo"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {gifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-24 text-center">
                        <Gift className="mb-4 h-10 w-10 text-muted-foreground" />
                        <p className="text-lg font-medium text-foreground">Tu lista está vacía</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            ¡Agregá tu primer regalo para empezar!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {gifts.map((gift) => (
                            <Card
                                key={gift.id}
                                className="flex flex-col border-border bg-card text-card-foreground transition-shadow hover:shadow-md"
                            >
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-semibold leading-snug text-card-foreground line-clamp-2">
                                        {gift.titulo}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="flex-1 pb-4 flex flex-col gap-2">
                                    {gift.precio !== undefined && gift.precio !== null && gift.precio > 0 && (
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">
                                                {formatCurrency(gift.precio)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Precio estimado</p>
                                        </div>
                                    )}

                                    {gift.talle && (
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">Detalle:</span> {gift.talle}
                                        </p>
                                    )}
                                </CardContent>

                                <CardFooter className="flex gap-2 border-t border-border pt-4">
                                    {gift.link ? (
                                        <Button variant="outline" size="sm" className="flex-1 gap-1.5" asChild>
                                            <a href={gift.link} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                Ir al Link
                                            </a>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" className="flex-1 gap-1.5" disabled>
                                            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                                            Sin Link
                                        </Button>
                                    )}

                                    {/* NUEVO: Botón de Editar */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                                        onClick={() => handleOpenEdit(gift)}
                                        aria-label={`Editar ${gift.titulo}`}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>

                                    {/* Botón de Eliminar */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => handleDelete(gift.id)}
                                        aria-label={`Eliminar ${gift.titulo}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}