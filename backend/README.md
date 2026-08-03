# NSU Architecture Queue Backend — MongoDB

## Requirements

- Node.js 20+
- MongoDB Atlas or MongoDB 7+

## Configure

```bash
cp .env.example .env
```

Set `MONGODB_URI` in `.env`.

## Install and run

```bash
npm install
npm start
```

Health check:

```text
GET /api/health
```

Expected database state:

```json
{"ok":true,"database":"connected"}
```

## Data migration

To import the former `data/store.json` records:

```bash
npm run migrate:json
```

## Production notes

- Do not commit `.env`.
- Use an Atlas database user with access only to the required database.
- Restrict Atlas Network Access to approved server IPs when a stable egress IP is available.
- Keep database backups enabled.
- Set `AUTO_SEED=false` after production data is loaded.
