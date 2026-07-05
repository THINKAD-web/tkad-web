"use client";

import {
  createLeafletContext,
  LeafletContext,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import L, { type MapOptions } from "leaflet";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Props = {
  center: [number, number];
  zoom: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  mapOptions?: MapOptions;
};

/**
 * Imperative Leaflet mount — avoids react-leaflet MapContainer ref bug where
 * `mapInstanceRef` survives unmount and blocks re-init (Strict Mode / HMR).
 */
export function LeafletMapHost({
  center,
  zoom,
  className,
  style,
  children,
  mapOptions = {},
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    delete (container as unknown as { _leaflet_id?: number })._leaflet_id;

    const map = L.map(container, mapOptions);
    map.setView(center, zoom);
    mapRef.current = map;
    setContext(createLeafletContext(map));

    return () => {
      mapRef.current = null;
      setContext(null);
      try {
        map.off();
        map.remove();
      } catch {
        /* interrupted HMR */
      }
      try {
        delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
        if (container.isConnected) {
          container.replaceChildren();
        }
      } catch {
        /* noop */
      }
    };
    // Map instance is created once per host mount; view updates use ProgrammaticView.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, []);

  return (
    <div ref={containerRef} className={className} style={style}>
      {context ? (
        <LeafletContext value={context}>{children}</LeafletContext>
      ) : null}
    </div>
  );
}
