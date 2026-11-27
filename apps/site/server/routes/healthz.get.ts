// Health check for rebuild.sh: 200 once the database is open and readable,
// 503 otherwise. Reports the version and commit, which every deploy check
// compares with the release it just built (canary, live, and public).
import { releaseCommit } from "../utils/release";

export default defineEventHandler((event) => {
  setHeader(event, "cache-control", "no-store");
  const version = useRuntimeConfig().public.version as string;
  try {
    const row = useDb().prepare("SELECT value FROM meta WHERE key = 'edition'").get() as { value: string };
    return { ok: true, version, commit: releaseCommit(), edition: row.value };
  } catch (err) {
    setResponseStatus(event, 503);
    return { ok: false, version, commit: releaseCommit(), error: (err as Error).message };
  }
});
