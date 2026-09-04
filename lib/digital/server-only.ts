/** Fail fast when a server-only digital module is pulled into a client bundle. */
if (typeof window !== "undefined") {
  throw new Error(
    "Digital catalog server modules cannot be imported from client components.",
  );
}
