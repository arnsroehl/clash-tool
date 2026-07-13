"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { claimLegacyAccounts } from "@/services/accountService";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const acceptUser = useCallback(async (nextUser: User | null) => {
    if (nextUser) await claimLegacyAccounts(nextUser.id);
    setUser(nextUser);
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    client.auth.getUser().then(({ data, error }) => {
      if (error) setAuthMessage(error.message);
      acceptUser(data.user).catch((claimError) => {
        setAuthMessage(
          claimError instanceof Error
            ? claimError.message
            : "Account-Übernahme fehlgeschlagen.",
        );
        setIsLoadingAuth(false);
      });
    });
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoadingAuth(false);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [acceptUser]);

  const signIn = async (email: string, password: string) => {
    setAuthMessage(null);
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) await claimLegacyAccounts(data.user.id);
  };
  const signUp = async (email: string, password: string) => {
    setAuthMessage(null);
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (data.user && data.session) await claimLegacyAccounts(data.user.id);
    if (!data.session)
      setAuthMessage(
        "Registrierung erfolgreich. Bitte bestätige deine E-Mail und melde dich danach an.",
      );
  };
  const signOut = async () => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  };

  return {
    user,
    isLoadingAuth,
    authMessage,
    setAuthMessage,
    signIn,
    signUp,
    signOut,
  };
}
