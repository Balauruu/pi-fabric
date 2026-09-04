# Consumer installation and Pi activation

`pi-fabric-arbor` is a Pi package containing an extension and the `fabric-arbor` skill. Pi packages execute with the user's full OS authority. Review the package, its license/notice inventory, and its retained certificates before installation.

## Requirements and support envelope

- Node.js 24 or newer.
- Pi with project trust enabled for project-local package resources.
- One exact certified pi-fabric release: `0.76.2 || 0.77.0`, with that release's retained package and host evidence.
- Linux, Git, user namespaces, and Bubblewrap matching the retained certificates for production admission.

The current sibling Pi host is the exactly certified `pi-fabric@0.77.0`; the retained active chain reports `productionCertified: true` and `realAgentsEnabled: true`. Support is a finite evidence-backed set, not an open-ended compatibility range: `0.76.2` and `0.77.0` each require their own matching B0/B1 payload, host-runtime, approval, and integration artifacts. Any other version or changed payload remains blocked; never copy or substitute another release's certificate.

## Install

After npm publication, install a pinned release globally:

```sh
pi install npm:pi-fabric-arbor@0.1.0
```

For a trusted project-local installation:

```sh
cd /path/to/project
pi install -l npm:pi-fabric-arbor@0.1.0
```

For a reviewed local checkout or unpacked tarball:

```sh
pi install /absolute/path/to/pi-fabric-arbor
# or, from a project, pi install -l ./vendor/pi-fabric-arbor
```

A relative local path is resolved against the settings file that records it. Pi installs npm packages under its package store and local path packages remain in place.

## Activate and verify discovery

1. Run `pi list` and confirm the expected pinned source.
2. Run `pi config` or `pi config -l`. Enable both `dist/src/extension.js` and `skills/fabric-arbor/SKILL.md` for the intended scope.
3. Trust the project with `/trust` if project-local settings are required, then restart Pi. `/reload` can reload an already trusted package after configuration changes.
4. Inspect Pi/Fabric discovery and the production-admission result before invoking anything. The extension registers `arbor-runtime` and `arbor-web`; the runtime may deliberately provide a blocked provider.
5. Invoke `/skill:fabric-arbor` for guided setup. The skill must check installation, component activation, action discovery, and admission first. It must not assume any `arbor.*` action exists.

A discovered action is not proof that production execution is admitted. Require all B0-B12 evidence, the release and graduation gates, exact distribution bytes, and `realAgentsEnabled: true`.

## Minimal detached Web use

Detached Web can operate against an authority database even when production execution is blocked:

```sh
pi-fabric-arbor serve --database /absolute/state/arbor.sqlite3 \
  --artifact-root /absolute/state/artifacts --host 127.0.0.1 --port 0
```

Open only the one-time loopback bootstrap URL emitted on stdout. The browser removes the fragment synchronously before exchange. Web is read/query/stream/inbox-only and cannot drive agents, authorize, sign, evaluate held-out input, clean resources, or move Git refs.

See [administrator-guide.md](administrator-guide.md) for durable configuration and [schema-reference.md](schema-reference.md) for public contracts.

## Uninstall without deleting user data

Disable the package in `pi config`, stop `arbor-runtime` and `arbor-web`, then remove the package registration:

```sh
pi remove npm:pi-fabric-arbor
# project-local installation:
pi remove -l npm:pi-fabric-arbor
```

This removes package registration and package-store code. It does not authorize deletion of authority databases, reports, artifacts, private repositories, operator keys, principal configuration, backups, or certificates stored outside the package directory. Keep those roots, or export and delete them later under the retention and cleanup procedure. Never point a state root inside Pi's package installation directory.
