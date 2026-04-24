"use client"; // Le decimos a Next.js que esto corre en el navegador

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Inicializamos el cliente normal con la clave pública
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      // Nos fijamos si hay una sesión activa guardada
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.push('/dashboard'); // Si está logueado, adentro
      } else {
        router.push('/login'); // Si no, a iniciar sesión
      }
    };

    checkUser();
  }, [router]);

  // Mientras decide a dónde mandarlo, podés mostrar un fondo vacío o un mini loader
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}