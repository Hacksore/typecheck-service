# typecheck-service

This is a cloudflare worker that will take in some typescript code and a testcase. It will use the typescript compiler API on the server to perform typechecking.

We will seed all the typescript lib files into an r2 bucket then at runtime fetch them all, then perform the typecheck and report back the errors.

Demo:
```
// TODO: write demo

```


### 🛑 Current blocker
```
feat/worker-cf ✗ $ pnpm run deploy

> typecheck-service@0.0.0 deploy /Users/hacksore/dev/typecheck-service
> wrangler deploy

 ⛅️ wrangler 3.14.0
-------------------
Your worker has access to the following bindings:
- R2 Buckets:
  - TYPEDEFS: typedefs
Total Upload: 8703.74 KiB / gzip: 1401.50 KiB
▲ [WARNING] We recommend keeping your script less than 1MiB (1024 KiB) after gzip. Exceeding past this can affect cold sta
rt time


▲ [WARNING] Here are the 5 largest dependencies included in your script:

  - node_modules/.pnpm/typescript@5.2.2/node_modules/typescript/lib/typescript.js - 8548.79 KiB
  - node_modules/.pnpm/zod@3.22.4/node_modules/zod/lib/index.mjs - 106.83 KiB
  - node_modules/.pnpm/hono@3.8.3/node_modules/hono/dist/hono-base.js - 7.11 KiB
  - node_modules/.pnpm/hono@3.8.3/node_modules/hono/dist/context.js - 6.83 KiB
  - node_modules/.pnpm/hono@3.8.3/node_modules/hono/dist/router/trie-router/node.js - 4.59 KiB
  If these are unnecessary, consider removing them


✘ [ERROR] A request to the Cloudflare API (/accounts/b58c346034f78e987facb6829f50f0a2/workers/scripts/typecheck-service) f
ailed.

  workers.api.error.script_too_large [code: 10027]
  
  If you think this is a bug, please open an issue at:
  https://github.com/cloudflare/workers-sdk/issues/new/choose


 ELIFECYCLE  Command failed with exit code 1.```
```
