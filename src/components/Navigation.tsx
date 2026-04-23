"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gift, Users, User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function Navigation() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    // Definimos nuestras rutas principales
    const navItems = [
        { name: "Mi Lista", href: "/dashboard", icon: Gift },
        { name: "Grupos", href: "/groups", icon: Users },
        { name: "Perfil", href: "/profile", icon: User },
    ];

    return (
        <>
            {/* 💻 NAVEGACIÓN DESKTOP (Barra Superior - Oculta en celulares) */}
            <header className="hidden md:flex sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            RegalandoAndo
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <nav className="flex gap-4">
                            {navItems.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${isActive ? "text-primary" : "text-muted-foreground"
                                            }`}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="h-4 w-px bg-border"></div> {/* Separador visual */}
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                            <LogOut className="h-4 w-4 mr-2" />
                            Salir
                        </Button>
                    </div>
                </div>
            </header>

            {/* 📱 NAVEGACIÓN MOBILE (Barra Inferior estilo Instagram - Oculta en desktop) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <item.icon className={`h-6 w-6 ${isActive ? "fill-primary/20" : ""}`} />
                                <span className="text-[10px] font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}