"use client";

import { TileLayer } from "react-leaflet";
import { useTheme } from "next-themes";
import {
  PUBLIC_DARK_MAP_TILE_SUBDOMAINS,
  PUBLIC_DARK_MAP_TILE_URL,
  PUBLIC_MAP_TILE_URLS,
  isPublicMapLightTile,
  isPublicMapLightTileFromTheme,
  publicMapTileUrlForTheme,
} from "@/lib/public-dark-map-config";

type Props = {
  themeAware?: boolean;
  /** 보고서 등 라이트 UI — Carto light 타일 고정 */
  preferLight?: boolean;
};

/** Carto 타일 — `themeAware` 시 next-themes light/dark 전환 */
export function DarkMapTileLayer({ themeAware = false, preferLight = false }: Props) {
  const { resolvedTheme } = useTheme();

  const url = preferLight
    ? PUBLIC_MAP_TILE_URLS.light
    : themeAware
      ? publicMapTileUrlForTheme(resolvedTheme)
      : PUBLIC_DARK_MAP_TILE_URL;

  return (
    <TileLayer
      key={preferLight ? "light" : themeAware ? `theme-${resolvedTheme ?? "light"}` : "static"}
      url={url}
      subdomains={PUBLIC_DARK_MAP_TILE_SUBDOMAINS}
      maxZoom={20}
      attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    />
  );
}

export function resolveDarkMapLightTiles(
  themeAware: boolean,
  resolvedTheme: string | undefined,
): boolean {
  return themeAware
    ? isPublicMapLightTileFromTheme(resolvedTheme)
    : isPublicMapLightTile();
}
