// Static shards (DESIGN.md §4b): /data/<edition>/<prefix>.json for browser
// programs that may fetch from w1913.com, and /data/<edition>/index.json
// listing them. Plain public files written by db-import: no keys, no
// accounts, nothing logged (nginx keeps no access log for this site). The
// nginx rate limit sketched in docs/nginx-site.conf would guard these too
// once it is applied.
import config from "../../../../../../w1913.config.ts";

export default defineEventHandler((event) => {
  const edition = getRouterParam(event, "edition") ?? "";
  const file = getRouterParam(event, "file") ?? "";
  if (edition !== config.edition.version) throw createError({ statusCode: 404, statusMessage: `This site serves edition ${config.edition.version}.` });
  // Only "index.json" or a one- or two-character prefix: nothing else can name a file.
  if (file !== "index.json" && !/^[a-z0-9]{1,2}\.json$/.test(file)) throw createError({ statusCode: 404, statusMessage: "No such shard" });
  const body = readShard(file);
  if (!body) throw createError({ statusCode: 404, statusMessage: "No such shard" });
  setHeader(event, "content-type", "application/json; charset=utf-8");
  setHeader(event, "access-control-allow-origin", "*");
  setHeader(event, "cache-control", "public, max-age=31536000, immutable");
  return body;
});
