"use client";

import { TileLayer } from "react-leaflet";
import { useTheme } from "next-themes";
import {
  PUBLIC_DARK_MAP_TILE_SUBDOMAINS,
  PUBLIC_DARK_MAP_TILE_URL,
  isPublicMapLightTile,
  isPublicMapLightTileFromTheme,
  publicMapTileUrlForTheme,
} from "@/lib/public-dark-map-config";

type Props = {
  themeAware?: boolean;
};

/** Carto 타일 — `themeAware` 시 next-themes light/dark 전환 */
export function DarkMapTileLayer({ themeAware = false }: Props) {
  const { resolvedTheme } = useTheme();

  const url = themeAware
    ? publicMapTileUrlForTheme(resolvedTheme)
    : PUBLIC_DARK_MAP_TILE_URL;

  return (
    <TileLayer
      key={themeAware ? `theme-${resolvedTheme ?? "light"}` : "static"}
      url={url}
      subdomains={PUBLIC_DARK_MAP_TILE_SUBDOMAINS}
      maxZoom={20}
      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
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
