"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Mail,
    Lock,
    User,
    Phone,
    Calendar,
    Gift,
    Eye,
    EyeOff,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

// ── Login form state ────────────────────────────────────────────────────────
interface LoginForm {
    email: string
    password: string
}

// ── Register form state ─────────────────────────────────────────────────────
interface RegisterForm {
    nombre: string
    apellido: string
    email: string
    telefono: string
    fechaNacimiento: string
    password: string
}

// ── Reusable labelled input ─────────────────────────────────────────────────
function FormField({
    id,
    label,
    icon: Icon,
    type = "text",
    value,
    onChange,
    placeholder,
    className = "",
    rightSlot,
}: {
    id: string
    label: string
    icon: React.ElementType
    type?: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    className?: string
    rightSlot?: React.ReactNode
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <Label htmlFor={id} className="text-zinc-300 text-sm font-medium">
                {label}
            </Label>
            <div className="relative">
                <Icon
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
                <Input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="pl-9 bg-zinc-950/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-lg h-10"
                />
                {rightSlot && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {rightSlot}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function AuthPage() {
    // Login state
    const [loginForm, setLoginForm] = useState<LoginForm>({ email: "", password: "" })
    const [showLoginPassword, setShowLoginPassword] = useState(false)
    const router = useRouter()

    // Register state
    const [registerForm, setRegisterForm] = useState<RegisterForm>({
        nombre: "",
        apellido: "",
        email: "",
        telefono: "",
        fechaNacimiento: "",
        password: "",
    })
    const [showRegisterPassword, setShowRegisterPassword] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        // v0 probablemente llamó al estado del login 'loginForm'
        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginForm.email,
            password: loginForm.password,
        })

        if (error) {
            alert("Error al iniciar sesión: " + error.message)
        } else {
            // Si sale todo bien, lo mandamos a la página principal
            router.push("/dashboard")
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()

        // Aquí usamos los estados que v0 ya creó (email, password, etc.)
        const { data, error } = await supabase.auth.signUp({
            email: registerForm.email, // la variable que guarda el email
            password: registerForm.password, // la variable que guarda la password
            options: {
                data: {
                    first_name: registerForm.nombre,
                    last_name: registerForm.apellido,
                    phone: registerForm.telefono,
                    birthday: registerForm.fechaNacimiento,
                }
            }
        })

        if (error) {
            alert("Error al registrarse: " + error.message)
        } else {
            alert("¡Registro exitoso! Revisa tu email para confirmar.")
        }
    }

    const patchLogin = (key: keyof LoginForm) => (v: string) =>
        setLoginForm((prev) => ({ ...prev, [key]: v }))

    const patchRegister = (key: keyof RegisterForm) => (v: string) =>
        setRegisterForm((prev) => ({ ...prev, [key]: v }))

    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
            {/* subtle radial glow behind the card */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 flex items-center justify-center"
            >
                <div className="w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg">
                {/* Brand badge */}
                <div className="flex flex-col items-center mb-8 gap-2">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
                        <Gift size={24} className="text-white" />
                    </div>
                    <span className="text-zinc-100 text-xl font-semibold tracking-tight">
                        Gift Registry
                    </span>
                    <span className="text-zinc-500 text-sm">Tu lista de regalos perfecta</span>
                </div>

                <Card className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-zinc-100 text-xl font-semibold text-center">
                            Bienvenido
                        </CardTitle>
                        <CardDescription className="text-zinc-400 text-sm text-center">
                            Accede o crea tu cuenta para gestionar tus listas de regalos
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="w-full mb-6 bg-zinc-800 rounded-xl p-1 h-10">
                                <TabsTrigger
                                    value="login"
                                    className="flex-1 rounded-lg text-zinc-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all text-sm"
                                >
                                    Iniciar Sesión
                                </TabsTrigger>
                                <TabsTrigger
                                    value="register"
                                    className="flex-1 rounded-lg text-zinc-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all text-sm"
                                >
                                    Crear Cuenta
                                </TabsTrigger>
                            </TabsList>

                            {/* ── Sign In Tab ──────────────────────────────────────────── */}
                            <TabsContent value="login">
                                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                    <FormField
                                        id="login-email"
                                        label="Correo Electrónico"
                                        icon={Mail}
                                        type="email"
                                        value={loginForm.email}
                                        onChange={patchLogin("email")}
                                        placeholder="correo@ejemplo.com"
                                    />

                                    <FormField
                                        id="login-password"
                                        label="Contraseña"
                                        icon={Lock}
                                        type={showLoginPassword ? "text" : "password"}
                                        value={loginForm.password}
                                        onChange={patchLogin("password")}
                                        placeholder="••••••••"
                                        rightSlot={
                                            <button
                                                type="button"
                                                onClick={() => setShowLoginPassword((p) => !p)}
                                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                                aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                            >
                                                {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        }
                                    />

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </button>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium rounded-lg shadow-md shadow-indigo-500/20 transition-all mt-2"
                                    >
                                        Entrar
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* ── Create Account Tab ───────────────────────────────────── */}
                            <TabsContent value="register">
                                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                                    {/* Row 1: Nombre + Apellido */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            id="reg-nombre"
                                            label="Nombre"
                                            icon={User}
                                            value={registerForm.nombre}
                                            onChange={patchRegister("nombre")}
                                            placeholder="Ana"
                                        />
                                        <FormField
                                            id="reg-apellido"
                                            label="Apellido"
                                            icon={User}
                                            value={registerForm.apellido}
                                            onChange={patchRegister("apellido")}
                                            placeholder="García"
                                        />
                                    </div>

                                    {/* Row 2: Email (full width) + Teléfono */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            id="reg-email"
                                            label="Correo Electrónico"
                                            icon={Mail}
                                            type="email"
                                            value={registerForm.email}
                                            onChange={patchRegister("email")}
                                            placeholder="correo@ejemplo.com"
                                            className="sm:col-span-2"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            id="reg-telefono"
                                            label="Teléfono"
                                            icon={Phone}
                                            type="tel"
                                            value={registerForm.telefono}
                                            onChange={patchRegister("telefono")}
                                            placeholder="+52 55 0000 0000"
                                        />

                                        {/* Row 3: Fecha de cumpleaños + Contraseña */}
                                        <FormField
                                            id="reg-fecha"
                                            label="Fecha de cumpleaños"
                                            icon={Calendar}
                                            type="date"
                                            value={registerForm.fechaNacimiento}
                                            onChange={patchRegister("fechaNacimiento")}
                                        />
                                    </div>

                                    <FormField
                                        id="reg-password"
                                        label="Contraseña"
                                        icon={Lock}
                                        type={showRegisterPassword ? "text" : "password"}
                                        value={registerForm.password}
                                        onChange={patchRegister("password")}
                                        placeholder="Mínimo 8 caracteres"
                                        rightSlot={
                                            <button
                                                type="button"
                                                onClick={() => setShowRegisterPassword((p) => !p)}
                                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                                aria-label={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                            >
                                                {showRegisterPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        }
                                    />

                                    <Button
                                        type="submit"
                                        className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium rounded-lg shadow-md shadow-indigo-500/20 transition-all mt-2"
                                    >
                                        Registrarme
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <p className="text-center text-zinc-600 text-xs mt-6">
                    Al continuar aceptas nuestros{" "}
                    <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">
                        Términos de Servicio
                    </span>{" "}
                    y{" "}
                    <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">
                        Política de Privacidad
                    </span>
                </p>
            </div>
        </main>
    )
}
