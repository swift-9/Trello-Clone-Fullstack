"use client";

import { useSession } from "@clerk/nextjs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type SupabaseContext = {
  supabase: SupabaseClient | null;
  isLoaded: boolean;
};
const Context = createContext<SupabaseContext>({
  supabase: null,
  isLoaded: false,
});

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useSession();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const clientRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    if (!session) return;

    let isMounted = true;

    // Reuse a single client instance to avoid multiple GoTrueClient warnings
    if (clientRef.current) {
      setSupabase(clientRef.current);
      setIsLoaded(true);
      return () => {
        isMounted = false;
      };
    }
    (async () => {
      // Clerk -> Supabase: prefer a JWT from a template (e.g., "supabase") when provided
      // via env var, otherwise fall back to the default session token.
      let token: string | null = null;
      const templateName = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;
      if (templateName) {
        try {
          token = await session.getToken({ template: templateName });
        } catch {}
      }
      if (!token) {
        token = await session.getToken();
      }

      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        }
      );

      if (isMounted) {
        clientRef.current = client;
        setSupabase(client);
        setIsLoaded(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [session]);

  return (
    <Context.Provider value={{ supabase, isLoaded }}>
      {/* {!isLoaded ? <div> Loading...</div> : children} */}
      {children}
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSupabase needs to be inside the provider");
  }

  return context;
};
