import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

export function Header({
  userName,
  rightSlot,
}: {
  userName: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-cream-50/90 backdrop-blur border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/eventos" className="text-xl font-display tracking-tight">
          Dominga
        </Link>
        <div className="flex-1">{rightSlot}</div>
        <span className="hidden sm:inline text-sm text-ink-muted">{userName}</span>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Cerrar sesión"
            className="h-9 w-9 inline-flex items-center justify-center rounded text-ink-muted hover:bg-cream-100"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
