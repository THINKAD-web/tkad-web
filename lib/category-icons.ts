import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  Bus,
  Calendar,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  MapPin,
  Monitor,
  ShoppingBag,
  Sparkles,
  Train,
  Tv2,
} from "lucide-react";

export type CategoryIconName =
  | "Train"
  | "Bus"
  | "Monitor"
  | "Tv2"
  | "GraduationCap"
  | "ShoppingBag"
  | "MapPin"
  | "Home"
  | "Building2"
  | "Heart"
  | "Sparkles"
  | "BookOpen"
  | "Landmark"
  | "Calendar"
  | "Globe";

const ICON_MAP: Record<CategoryIconName, LucideIcon> = {
  Train,
  Bus,
  Monitor,
  Tv2,
  GraduationCap,
  ShoppingBag,
  MapPin,
  Home,
  Building2,
  Heart,
  Sparkles,
  BookOpen,
  Landmark,
  Calendar,
  Globe,
};

export function getCategoryIcon(name: CategoryIconName): LucideIcon {
  return ICON_MAP[name];
}
