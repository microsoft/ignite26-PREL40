# Source

| Path | What it is |
| --- | --- |
| [`home-loan-desk/`](home-loan-desk/) | The Home Loan Operations Desk lab starter: a Fabric App (Rayfin) template that attendees scaffold and extend with the GitHub Copilot app. |

Attendees create their project from the published template with:

```bash
npx rayfin init home-loan-desk -t https://github.com/microsoft/ignite26-PREL40.git#<tag> --yes
```

The root [`rayfin-template.yml`](../rayfin-template.yml) is the template catalog. It has a single entry that points to `home-loan-desk/`.

## Working on the starter

`home-loan-desk/` is a working Rayfin project. From that folder:

```bash
npm install
npm run typecheck && npm run build && npm run lint && npm test
```

Every `@microsoft/rayfin-*` package is pinned to `1.36.2`. Files the Rayfin CLI manages (`.agents/skills/rayfin*`, `.mcp.json`, `rayfin/.lockfile.json`, `rayfin/.project.json`) stay out of git, because `rayfin init` reinstalls them in every scaffolded project.
