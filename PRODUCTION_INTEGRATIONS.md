# Production External Integrations

This project now supports production-grade external integrations for:
- Bank account linking + transaction sync (`Plaid`)
- Investment order execution (`Alpaca`)
- AI financial advisor insights (`OpenAI`)

## 1. Manual Setup You Must Do

1. Create provider accounts:
- Plaid Dashboard: https://dashboard.plaid.com/
- Alpaca Dashboard: https://app.alpaca.markets/
- OpenAI Platform: https://platform.openai.com/

2. Create API credentials:
- Plaid: `client_id`, `secret` (sandbox/development/production)
- Alpaca: `APCA-API-KEY-ID`, `APCA-API-SECRET-KEY`
- OpenAI: `OPENAI_API_KEY`

3. Create `backend/.env` from `backend/.env.example` and fill all values.

4. Generate encryption key:
- Use a long random string for `APP_ENCRYPTION_KEY` (at least 32 chars).
- This encrypts provider access tokens stored in DB.

5. Configure Plaid Link settings:
- Allowed redirect URI (if used): `PLAID_REDIRECT_URI`
- Webhook URL (recommended): `PLAID_WEBHOOK_URL`
- Set environment via `PLAID_ENV` (`sandbox`, `development`, `production`).

6. Keep Alpaca in paper mode first:
- Use `ALPACA_BASE_URL=https://paper-api.alpaca.markets` initially.
- Switch to live endpoint only after paper validation and risk controls.

7. Start backend:
- `cd backend`
- `npm install`
- `npm run dev`

## 2. New Backend Endpoints

### Finance (Plaid + Advisor)
- `POST /api/finance/bank/link-token`
- `POST /api/finance/bank/exchange-public-token`
- `POST /api/finance/bank-accounts/:id/sync`
- `GET /api/finance/bank-transactions`
- `GET /api/finance/advisor`

### Investments (Alpaca)
- `POST /api/investments/trades` with `executeLive: true` to place broker order
- `GET /api/investments/broker/account`
- `GET /api/investments/broker/positions`

## 3. How To Verify Each Integration

1. Plaid bank integration:
- Call `POST /api/finance/bank/link-token` and confirm `linkToken` is returned.
- Complete Plaid Link on frontend and submit `public_token` to:
  - `POST /api/finance/bank/exchange-public-token`
- Confirm `BankAccount` docs created with:
  - `provider: "plaid"`
  - `providerAccountId` populated
  - encrypted token field populated

2. Automatic transaction tracking:
- Call `POST /api/finance/bank-accounts/:id/sync`
- Confirm `BankTransaction` records are upserted/updated/removed based on Plaid delta sync.
- Confirm account `providerSyncCursor` and `lastSyncedAt` update.

3. Investment trading execution:
- Submit order:
  - `POST /api/investments/trades`
  - include `executeLive: true`, `symbol`, `side`, `quantity`, `timeInForce`
- Confirm returned order has:
  - `broker: "alpaca"`
  - `brokerOrderId`
  - `status` from broker
- Verify at Alpaca dashboard.

4. AI financial advisor:
- Call `GET /api/finance/advisor`
- If OpenAI key is configured, response `metadata.source` should be `openai`.
- If not configured or request fails, it safely falls back to `rules`.

## 4. Production Hardening Checklist

1. Secret management:
- Move all provider keys to a secret manager (AWS/GCP/Azure/Vault), not plain `.env`.

2. Webhook handling:
- Add provider webhook endpoint(s) and signature validation before enabling production automations.

3. Observability:
- Add structured logs around external API latency/error rates.
- Add alerting on Plaid sync failures and broker order rejections.

4. Risk controls:
- Add trade notional limits, symbol allowlists, and user-level execution permissions.
- Require 2-step confirmation for live orders.

5. Compliance:
- Add explicit user consent records for bank data access.
- Add data retention policy and deletion workflow.

6. Resilience:
- Add retry with backoff for transient provider errors.
- Add idempotency keys for order placement and token exchange flows.
