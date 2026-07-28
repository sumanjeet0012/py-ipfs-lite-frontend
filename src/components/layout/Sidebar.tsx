import { NavLink } from "react-router-dom";
import {
  Database,
  LayoutDashboard,
  Files,
  Box,
  GitBranch,
  Pin,
  Wifi,
  HardDrive,
  Globe,
  Bug,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/files", label: "Files", icon: Files },
  { to: "/blocks", label: "Blocks", icon: Box },
  { to: "/dag", label: "DAG", icon: GitBranch },
  { to: "/pins", label: "Pins", icon: Pin },
  { to: "/swarm", label: "Swarm", icon: Wifi },
  { to: "/repo", label: "Repo", icon: HardDrive },
  { to: "/ipns", label: "IPNS", icon: Globe },
  { to: "/debug", label: "Debug", icon: Bug },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Database className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">py-ipfs-lite</span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
