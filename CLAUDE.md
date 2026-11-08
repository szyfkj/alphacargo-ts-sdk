# alphacargo-ts-sdk

Node.js and TypeScript client for the TMS (Transport Management System) HTTP API, package
`@alphacargo/tms-sdk`. It is used by programs that call that API. Usage, configuration and the
list of resources are in [README.md](README.md).

## Where the code is maintained

Most commits here are titled `chore: update SDK from tms project`, and they update `README.md`,
`src/`, `dist/` and `package.json` together. The SDK is maintained in the TMS project and copied
here. A change made only in this repository is not in that source and can be replaced by the next
update.

## Layout

- `src/client.ts`: `TMSClient`, which creates one resource object per property.
- `src/resources/<name>.ts`: one class per API resource, re-exported by `src/resources/index.ts`.
- `src/utils.ts`: signing, webhook verification, `HttpClient`, `TMSApiError`.
- `src/types.ts`: request and response types.
- `src/index.ts`: names every public export, types included. A type not listed there cannot be
  imported from the package root.
- `dist/`: the committed build output. `package.json` has no `prepare` script, so a Git install
  relies on it.

## Commands

The package manager is pnpm, pinned by `packageManager` in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build                       # tsup: CommonJS, ESM and type declarations into dist/
```

These were run on 2026-11-08 under Node 22 and succeeded; the build left `dist/` unchanged. There
are no tests: `pnpm test` starts Vitest, and `pnpm exec vitest run` exits 1 with "No test files
found". The repository has no CI workflows.

## Invariants

- `sign` is `HMAC-SHA256(apiSecret, canonicalizeJson(request without sign))` in uppercase hex
  (`generateSignature`). `canonicalizeJson` must match the server's implementation.
- `getWithSignature` converts every GET parameter to a string before signing, because the server
  reads query parameters as strings. Signing a number would produce a different signature.
- `nonceStr` is `String(Date.now())`. `verifyWebhookSignature` reads it as milliseconds for its
  freshness check (five minutes by default).
- With `debug` on, only method, path and status are logged. A signed request is a credential for
  the length of its nonce window, so query strings, bodies and responses must not be logged.
- `HttpClient.request` unwraps a response only when it has both `success` and `code`. Any other
  response, including paginated results with their own `data` field, is returned as it is.

## Known discrepancies

- **Version.** `package.json` says 2.7.3 and the tag `v2.7.3` is the current `main`, while the
  README and code comments describe 3.0. The code on `main` has the behaviour described for 3.0:
  signatures are always keyed, and `signatureScheme` and `requireSecret` are ignored.
- **Installation.** The README says `npm install @alphacargo/tms-sdk`, but `npm view` returned 404
  for that name on 2026-11-08. `pnpm add github:szyfkj/alphacargo-ts-sdk#v2.7.3` installed and
  loaded on the same date.
- **Node version.** `engines` says Node 18 or later, but signing uses the global `crypto`.
  `generateSignature` threw `crypto is not defined` on Node 18.20.8 and worked on Node 22.20.0.
- **Non-JSON responses.** `HttpClient.request` always calls `response.json()`, so a non-JSON reply
  raises a parse error rather than a `TMSApiError`.

## How changes land

The base branch is `main`. Changes to the SDK belong in the TMS project (see above). For anything
specific to this repository, work on a branch and open a pull request against `main`. Releases are
tags of the form `v<version>`.
