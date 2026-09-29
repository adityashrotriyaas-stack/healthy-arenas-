# Task 1 Report: Install web-push and generate VAPID keys

**Status:** DONE

## What I did

1. Installed `web-push` v3.6.7 via `npm install web-push`
2. Generated VAPID keys via `npx web-push generate-vapid-keys`
3. Added keys and email to `.env`
4. Added placeholder entries to `.env.example`
5. Verified installation with `npm ls web-push`

## VAPID Keys

- **Public Key:** `BJ_ps4gkp5wOBGfoA8CTuh6qp7fYAb27WJBFpmW7J9BU6m7alJbXRBW17g3g6U6xXqnSMljpaFvl9Mxwa7UrDi4`
- **Private Key:** `l929ms8Am6OhGmOxgGf-nrlZSyRhwkCNqlTftcujfyY`
- **Email:** `mailto:admin@healthyarena.shop`

## Files Changed

- `package.json` — `web-push` added as dependency
- `package-lock.json` — auto-generated
- `.env` — added `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- `.env.example` — added placeholder entries

## Notes

- `.env` is gitignored; only `.env.example` will be committed per project conventions.
- No issues encountered.
