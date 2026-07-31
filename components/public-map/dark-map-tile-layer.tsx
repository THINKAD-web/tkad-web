"use client";

import { TileLayer } from "react-leaflet";
import { useTheme } from "next-themes";
import {
  PUBLIC_DARK_MAP_TILE_SUBDOMAINS,
  PUBLIC_DARK_MAP_TILE_URL,
  PUBLIC_MAP_TILE_URLS,
  isPublicMapLightTile,
  isPublicMapLightTileFromTheme,
  publicMapTileAttributionForTheme,
  publicMapTileUrlForTheme,
} from "@/lib/public-dark-map-config";
import { isVWorldTilesConfigured } from "@/lib/public-vworld-map-config";

type Props = {
  themeAware?: boolean;
  /** 보고서 등 라이트 UI — Carto light 타일 고정 */
  preferLight?: boolean;
};

/** Carto 타일 — `themeAware` 시 next-themes light/dark 전환 */
export function DarkMapTileLayer({ themeAware = false, preferLight = false }: Props) {
  const { resolvedTheme } = useTheme();

  const useVWorldLight =
    themeAware && !preferLight && resolvedTheme !== "dark" && isVWorldTilesConfigured();

  const url = preferLight
    ? PUBLIC_MAP_TILE_URLS.light
    : themeAware
      ? publicMapTileUrlForTheme(resolvedTheme)
      : PUBLIC_DARK_MAP_TILE_URL;

  const attribution = preferLight
    ? '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : themeAware
      ? publicMapTileAttributionForTheme(resolvedTheme)
      : '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <TileLayer
      key={
        preferLight
          ? "light"
          : themeAware
            ? useVWorldLight
              ? "vworld"
              : `theme-${resolvedTheme ?? "light"}`
            : "static"
      }
      url={url}
      {...(useVWorldLight
        ? { maxZoom: 19 }
        : {
            subdomains: PUBLIC_DARK_MAP_TILE_SUBDOMAINS,
            maxZoom: 20,
          })}
      attribution={attribution}
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
