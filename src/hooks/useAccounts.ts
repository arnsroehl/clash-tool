"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
} from "@/services/accountService";
import type {
  AccountFormValues,
  ClashAccount,
} from "@/types/account";

type UseAccountsOptions = {
  onError: (message: string) => void;
  clearError: () => void;
  enabled?: boolean;
};

function getAccountFormValues(form: HTMLFormElement): AccountFormValues {
  const formData = new FormData(form);

  return {
    name: String(formData.get("name") || "").trim(),
    townHallLevel: Number(formData.get("townHallLevel")),
    builderCount: Number(formData.get("builderCount")),
  };
}

function isValidAccountForm(values: AccountFormValues): boolean {
  return Boolean(values.name && values.townHallLevel && values.builderCount);
}

export function useAccounts({ onError, clearError, enabled = true }: UseAccountsOptions) {
  const [accounts, setAccounts] = useState<ClashAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ClashAccount | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      if (!enabled) {
        setAccounts([]);
        setSelectedAccount(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const loadedAccounts = await fetchAccounts();
        setAccounts(loadedAccounts);
        setSelectedAccount(loadedAccounts[0] || null);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Accounts konnten nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAccounts();
  }, [enabled, onError]);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();

    const form = event.currentTarget;
    const values = getAccountFormValues(form);

    if (!isValidAccountForm(values)) {
      onError("Bitte fülle alle Felder aus.");
      return;
    }

    setIsSaving(true);

    try {
      const newAccount = await createAccount(values);
      setAccounts((currentAccounts) => [newAccount, ...currentAccounts]);
      setSelectedAccount(newAccount);
      form.reset();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Account konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount(accountId: string) {
    clearError();
    setIsDeletingId(accountId);

    try {
      await deleteAccount(accountId);

      setAccounts((currentAccounts) => {
        const remainingAccounts = currentAccounts.filter(
          (account) => account.id !== accountId,
        );

        if (selectedAccount?.id === accountId) {
          setSelectedAccount(remainingAccounts[0] || null);
        }

        return remainingAccounts;
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Account konnte nicht gelöscht werden.");
    } finally {
      setIsDeletingId(null);
    }
  }

  return {
    accounts,
    selectedAccount,
    isLoading,
    isSaving,
    isDeletingId,
    createAccount: handleCreateAccount,
    deleteAccount: handleDeleteAccount,
    selectAccount: setSelectedAccount,
  };
}
