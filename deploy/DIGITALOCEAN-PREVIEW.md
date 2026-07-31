# Wormifi DigitalOcean preview handoff

## Scope and isolation

`do-preview.yaml` describes the isolated App Platform app named
`wormifi-preview`. It uses only
`https://github.com/emailonly613-web/wormifi.git`. It does not reference, update,
or reuse either Fire Your Coworkers app. The first deployment used only the
DigitalOcean-assigned `*.ondigitalocean.app` starter domain. The `wormifi.com`
and `www.wormifi.com` declarations were added afterward, only after the starter
passed public HTTPS, WSS, two-client/reconnect, desktop, mobile, and replay proof.

The app has two components:

- `web`: the Vite static build, served at `/` through the static CDN.
- `arena`: one Node service at internal port `8080`. Public WebSocket upgrades
  at `/arena` are routed to it, and `/healthz` is preserved for both the public
  proof and App Platform's component health check.

The production browser already derives the same-origin socket URL as
`wss://<current-host>/arena`, so the preview does not need to bake an unknown
starter hostname into `VITE_ARENA_WS_URL`.

The separately deployed legacy `store` proof is intentionally fail-closed.
`GET /store/healthz` must report `checkoutEnabled: false` and
`purchasable: false`; both checkout and verification return `503` without
contacting Stripe. Hidden UI is not the control. Enabling payment is prohibited
until the ordered Captain Passport gates in
`docs/CAPTAIN-PASSPORT-GENERATION-AHEAD-AUDIT.md` pass and the owner gives a
separate explicit authorization.

## Required preconditions

Do not create the app until all of these are true:

1. `main` exists on the dedicated Wormifi remote and contains the reviewed
   project. At the time of this audit, `git ls-remote --heads origin main`
   returned no branch.
2. Keep the root and server Node engine ranges compatible with DigitalOcean's
   published Ubuntu 22 buildpack ceiling. They are now aligned at
   `>=24.14.0 <25`, while this spec pins both builds to `24.14.1`.
3. Keep the exact `pnpm@11.18.0` `packageManager` pin in both root and server
   manifests so the two component builds remain repeatable.
4. Finish the in-flight Collector multiplayer/replay integration and rerun the
   complete product gate. The earlier transient missing-field compile failure
   was repaired; it must not be confused with final release validation.
5. Push the reviewed lockfiles and source to `main`, then rerun both spec and
   product validation.

These are source/repository preconditions. They are intentionally not hidden
with speculative build environment overrides in the app spec.

## Validation without deployment

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/tests/validate-preview-spec.ps1
doctl apps spec validate deploy/do-preview.yaml
```

The first command applies local isolation guards and DigitalOcean schema
validation. The second asks the authenticated DigitalOcean API to perform full
validation. Both passed during this audit after changing the health ingress
from unsupported exact matching to prefix matching. Full spec validation does
not clone the repository or execute the build, so rerun it after `main` exists.
Neither command creates or updates an app.

The Wormifi app now exists as `209351f3-4440-4e23-9dd1-93dd9274ec26`.
After the candidate is committed, pushed and explicitly accepted, apply this
reviewed spec to that exact Wormifi app with:

```powershell
doctl apps update 209351f3-4440-4e23-9dd1-93dd9274ec26 --spec deploy/do-preview.yaml --update-sources --wait
```

Do not run `apps create`, and never supply either Fire Your Coworkers app ID.
The spec deliberately retains one `basic-xs` service instance and one
static-site component.

## Post-deployment preview gate

Before considering any custom domain:

1. Confirm `GET https://<domain>/build-info.json` returns
   `{ "product": "wormifi", "protocolVersion": 5,
   "buildRevision": "<deployed-git-sha>" }` from the static client and that the
   revision equals the candidate being proved.
2. Confirm `GET https://<domain>/healthz` returns
   `{ "ok": true, "authority": "server", "protocolVersion": 5,
   "buildRevision": "<deployed-git-sha>", ... }` and that the revision equals
   both the candidate and the static-client revision.
3. Connect to `wss://<domain>/arena`, join a room, and require a valid
   server welcome, world sync, and fresh snapshots.
4. Run two independent browsers in the same room and verify shared authority,
   movement, disconnect/reconnect, and no fallback to local practice state.
5. Repeat desktop/mobile proof and an external network run. The existing load
   report is localhost evidence only.
6. Review service CPU, memory, restarts, bandwidth, and connection stability in
   App Platform Insights.

The first two checks are deliberately automated and fail closed:

```powershell
pnpm verify:deployment-identity -- https://wormifi.com <deployed-git-sha>
```

That gate passed on the isolated starter domain before the reviewed `domains`
block was added. Domain health and certificate issuance remain separate checks;
the declaration itself is not proof that DNS or TLS is ready.

## Platform limitations that affect this design

- App Platform exposes the public service over HTTPS/port 443, so browsers must
  use `wss://`; `8080` is the container's internal HTTP port.
- The current room directory, authoritative state, and reconnect tokens are
  process memory. The preview is therefore pinned to **one instance**. Scaling
  to multiple instances is unsafe until there is shared room routing/state or a
  proven affinity design. A container replacement loses active sessions.
- One instance is not high availability. DigitalOcean documents HA only for
  apps with at least two containers, which conflicts with the current
  in-memory room design.
- App Platform does not cap concurrent connections, but every WebSocket uses
  service resources. The app still needs external soak testing and admission/
  abuse controls before an open public launch.
- The local container filesystem is ephemeral and cannot persist accounts,
  room history, or replays across deployments/replacements.
- Static-site CDN caching cannot be disabled for an app containing a static
  site. This is acceptable for versioned Vite assets; real-time traffic stays
  on the `arena` service route.

Current DigitalOcean references:

- [App spec reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)
- [Node.js buildpack and supported runtimes](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/)
- [App Platform limits](https://docs.digitalocean.com/products/app-platform/details/limits/)
- [Environment variables and bindables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)
