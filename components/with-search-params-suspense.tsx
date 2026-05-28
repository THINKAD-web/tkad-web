"use client";

import { Suspense, type ComponentType, type ReactNode } from "react";

/** Wrap client components that call `useSearchParams()` for App Router static/SSG builds. */
export function withSearchParamsSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback: ReactNode = null,
) {
  function WithSearchParamsSuspense(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  }

  WithSearchParamsSuspense.displayName = `WithSearchParamsSuspense(${
    Component.displayName ?? Component.name ?? "Component"
  })`;

  return WithSearchParamsSuspense;
}
