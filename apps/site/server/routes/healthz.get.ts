// Health check for rebuild.sh: 200 once the database is open and readable, 503 otherwise.
export default defineEventHandler((event) => {
  try {
    const row = useDb().prepare("SELECT value FROM meta WHERE key = 'edition'").get() as { value: string };
    setHeader(event, "cache-control", "no-store");
    return { ok: true, edition: row.value };
  } catch (err) {
    setResponseStatus(event, 503);
    return { ok: false, error: (err as Error).message };
  }
});
