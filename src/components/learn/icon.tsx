import {
  Award,
  BrainCircuit,
  CalendarCheck,
  Cloud,
  Code2,
  Flame,
  FolderGit2,
  Gamepad2,
  LineChart,
  Puzzle,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sunrise,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * A small registry so the content data files can name their icons as strings
 * (keeping them JSX-free and importable anywhere) while the UI resolves them to
 * real components. Anything not registered falls back to a neutral mark.
 */
const REGISTRY: Record<string, LucideIcon> = {
  Award,
  BrainCircuit,
  CalendarCheck,
  Cloud,
  Code2,
  Flame,
  FolderGit2,
  Gamepad2,
  LineChart,
  Puzzle,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sunrise,
  Zap,
};

export function ContentIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = REGISTRY[name] ?? Sparkles;
  return <Icon size={size} />;
}
