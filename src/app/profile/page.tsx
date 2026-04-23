"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Save, LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";

export default function PerfilPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userAuth, setUserAuth] = useState<any>(null);

    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        email: "",
        telefono: "",
        fecha_cumpleanos: "",
    });

    useEffect(() => {
        const fetchPerfil = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push("/login");
                return;
            }

            setUserAuth(session.user);

            // Traemos los datos de la tabla pública de usuarios
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (!error && data) {
                setForm({
                    nombre: data.nombre || "",
                    apellido: data.apellido || "",
                    email: data.email || "", // Lo mostramos pero no lo dejamos editar
                    telefono: data.telefono || "",
                    fecha_cumpleanos: data.fecha_cumpleanos || "",
                });
            }
            setLoading(false);
        };

        fetchPerfil();
    }, [router]);

    const handleSave = async () => {
        if (!form.nombre.trim() || !form.apellido.trim()) {
            alert("El nombre y el apellido son obligatorios.");
            return;
        }

        setSaving(true);

        const { error } = await supabase
            .from('usuarios')
            .update({
                nombre: form.nombre.trim(),
                apellido: form.apellido.trim(),
                telefono: form.telefono.trim() || null,
                fecha_cumpleanos: form.fecha_cumpleanos || null,
            })
            .eq('id', userAuth.id);

        setSaving(false);

        if (error) {
            alert("Hubo un error al guardar tu perfil.");
            console.error(error);
        } else {
            alert("¡Perfil actualizado con éxito!");
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Cargando tu perfil...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navigation />

            <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10 pb-24">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Actualizá tu información personal.
                    </p>
                </div>

                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <User className="h-5 w-5 text-primary" />
                            Datos Personales
                        </CardTitle>
                        <CardDescription>
                            Tus amigos verán estos datos para saber cuándo es tu cumpleaños.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">

                        {/* Fila 1: Nombre y Apellido */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="nombre">Nombre <span className="text-destructive">*</span></Label>
                                <Input
                                    id="nombre"
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    className="bg-input"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="apellido">Apellido <span className="text-destructive">*</span></Label>
                                <Input
                                    id="apellido"
                                    value={form.apellido}
                                    onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                                    className="bg-input"
                                />
                            </div>
                        </div>

                        {/* Fila 2: Email (Bloqueado) */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email">Correo Electrónico (No editable)</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                disabled
                                className="bg-input opacity-60 cursor-not-allowed"
                            />
                        </div>

                        {/* Fila 3: Teléfono y Cumpleaños */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="telefono">Teléfono (Opcional)</Label>
                                <Input
                                    id="telefono"
                                    type="tel"
                                    placeholder="Ej. +54 9 11..."
                                    value={form.telefono}
                                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                    className="bg-input"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="cumpleanos">Fecha de Cumpleaños</Label>
                                <Input
                                    id="cumpleanos"
                                    type="date"
                                    value={form.fecha_cumpleanos}
                                    onChange={(e) => setForm({ ...form, fecha_cumpleanos: e.target.value })}
                                    className="bg-input"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full md:w-auto self-end mt-4 gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </CardContent>
                </Card>

                {/* BOTÓN DE LOGOUT SOLO PARA MOBILE */}
                <div className="mt-12 md:hidden">
                    <div className="border-t border-border pt-8 mb-4">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Opciones de cuenta</h3>
                        <Button
                            variant="destructive"
                            className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white border-transparent"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}