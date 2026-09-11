// Runs real route handlers against SQLite without opening a network listener.
// Only the D1 binding is replaced. Authentication runs through the real library.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";
import { DatabaseSync } from "node:sqlite";
import { createInterface } from "node:readline";
const require = createRequire(import.meta.url),
  ts = require("typescript");
const root = path.resolve(import.meta.dirname, "..");
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys=ON");
for (const filename of fs
  .readdirSync(path.join(root, "drizzle"))
  .filter((v) => v.endsWith(".sql"))
  .sort())
  sqlite.exec(fs.readFileSync(path.join(root, "drizzle", filename), "utf8"));
class Statement {
  constructor(sql, values = []) {
    this.sql = sql;
    this.values = values;
  }
  bind(...values) {
    return new Statement(this.sql, values);
  }
  async first(column) {
    const row = sqlite.prepare(this.sql).get(...this.values);
    return row ? (column ? row[column] : { ...row }) : null;
  }
  async all() {
    return {
      results: sqlite
        .prepare(this.sql)
        .all(...this.values)
        .map((r) => ({ ...r })),
      success: true,
    };
  }
  async run() {
    const result = sqlite.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
  async raw() {
    const statement = sqlite.prepare(this.sql);
    statement.setReturnArrays(true);
    return statement.all(...this.values);
  }
}
const db = {
  prepare(sql) {
    return new Statement(sql);
  },
  async batch(statements) {
    sqlite.exec("BEGIN");
    try {
      const results = [];
      for (const s of statements) results.push(await s.run());
      sqlite.exec("COMMIT");
      return results;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  },
};
const requestContext = new AsyncLocalStorage();
const env = {
  DB: db,
  AUTH_BASE_URL: "http://127.0.0.1:8787",
  AUTH_SECRET: "local-testing-secret-" + "x".repeat(40),
  ORGANIZER_SETUP_HASH: "",
};
env.ORGANIZER_SETUP_HASH = require("node:crypto").createHash("sha256").update("signal-local-test-only-code").digest("hex");
const modules = new Map();
function load(filename) {
  let file = filename;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file = path.join(file, "index.ts");
  if (!fs.existsSync(file)) {
    if (fs.existsSync(file + ".ts")) file += ".ts";
    else file = path.join(file, "index.ts");
  }
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const source = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  function localRequire(spec) {
    if (spec === "cloudflare:workers") return { env };
    if (spec === "next/headers")
      return { headers: async () => requestContext.getStore().headers };
    if (spec === "next/navigation")
      return {
        redirect: (url) => {
          throw new Error("Redirect: " + url);
        },
      };
    if (spec.startsWith("@/")) return load(path.join(root, spec.slice(2)));
    if (spec.startsWith("."))
      return load(path.resolve(path.dirname(file), spec));
    return require(spec);
  }
  vm.runInThisContext("(function(require,module,exports){" + js + "\n})", {
    filename: file,
  })(localRequire, module, module.exports);
  return module.exports;
}
const handlers = load(path.join(root, "app/api/[...path]/route.ts"));
const authHandlers = load(path.join(root, "app/api/auth/[...all]/route.ts"));
const lines = createInterface({ input: process.stdin });
for await (const line of lines) {
  try {
    const input = JSON.parse(line),
      request = new Request("http://127.0.0.1:8787" + input.path, {
        method: input.method,
        headers: input.headers,
        body: input.body ?? undefined,
      });
    const response = await requestContext.run(request, () =>
      (input.path.startsWith("/api/auth/") ? authHandlers : handlers)[input.method](request),
    );
    process.stdout.write(
      JSON.stringify({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        cookies: response.headers.getSetCookie(),
        body: await response.text(),
      }) + "\n",
    );
  } catch (error) {
    process.stdout.write(JSON.stringify({ fatal: String(error) }) + "\n");
  }
}
