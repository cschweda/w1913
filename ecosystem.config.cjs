// PM2 process file for W1913 on the droplet. rebuild.sh is the only thing
// that should start, reload, or re-register this app; see the notes there.
//
// Layout (DESIGN.md §3, "Deploying"):
//
//   $W1913_DEPLOY_ROOT/                default ~/w1913-deploy
//     releases/<stamp>-<sha>/          one complete build per deploy
//       apps/site/.output/             the Nuxt node-server bundle
//       data/w1913.sqlite              the read-only database for that build
//     current -> releases/<…>          symlink, switched atomically by rebuild.sh
//
// PM2 always runs `current/…`, so a deploy or a rollback is a symlink switch
// plus `pm2 reload`. The script path in this file never changes.
//
// PM2 applies the options below only when the process is REGISTERED. A plain
// reload keeps the old values (and the old interpreter). rebuild.sh therefore
// hashes this file and re-registers the app (pm2 delete w1913 + pm2 start)
// whenever the hash changes; an ordinary deploy reloads in place.

const os = require("os");
const path = require("path");

const root = process.env.W1913_DEPLOY_ROOT || path.join(os.homedir(), "w1913-deploy");
const current = path.join(root, "current");

module.exports = {
  apps: [
    {
      name: "w1913",
      cwd: current,
      script: path.join(current, "apps/site/.output/server/index.mjs"),

      // Run the server on the Node that runs this PM2 command, not on whatever
      // Node the PM2 daemon happened to start under months ago. rebuild.sh
      // loads the Node version from .nvmrc before calling PM2.
      interpreter: process.execPath,

      // Cluster mode lets `pm2 reload` swap workers one at a time, with no
      // gap in service. The database is opened read-only by every worker.
      exec_mode: "cluster",
      instances: Number(process.env.W1913_INSTANCES || 2),

      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: process.env.W1913_PORT || "3913",
        W1913_DB_PATH: path.join(current, "data/w1913.sqlite"),
      },

      // A process that cannot stay up for 10 s, 10 times running, is marked
      // "errored" and left down instead of crash-looping out of sight.
      min_uptime: "10s",
      max_restarts: 10,
      exp_backoff_restart_delay: 200,
      max_memory_restart: process.env.W1913_MAX_MEMORY || "450M",
      kill_timeout: 5000,
      listen_timeout: 10000,

      time: true,
      merge_logs: true,
    },
  ],
};
