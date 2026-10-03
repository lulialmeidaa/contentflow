import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions";
import { PageHeader } from "@/components/ui";
import { getProfile, getSession } from "@/lib/data";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const [profile, { user }] = await Promise.all([getProfile(), getSession()]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader eyebrow="Preferências" title="Configurações" />
      <SettingsForm profile={profile} />
      <form action={signOut} className="flex items-center justify-between border-t border-line pt-5 text-sm text-muted">
        <span>{user.email}</span>
        <button className="btn-ghost text-muted">
          <LogOut size={15} /> Sair
        </button>
      </form>
    </div>
  );
}
