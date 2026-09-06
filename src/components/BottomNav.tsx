import { Link } from "@tanstack/react-router";
import { Home, PlusCircle, MessagesSquare, User } from "lucide-react";

const items = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/create", label: "Post", icon: PlusCircle },
  { to: "/chats", label: "Chats", icon: MessagesSquare },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
            activeProps={{ className: "!text-primary" }}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
