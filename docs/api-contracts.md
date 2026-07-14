# Nexo API Contracts

Nexo API version: `0.1.0`

Status: backend CRUD base exists under `/api`. The Flutter UI still uses mock repositories.

## Standard Responses

Success:

```json
{
  "ok": true,
  "data": {},
  "message": "Optional message"
}
```

Error:

```json
{
  "ok": false,
  "message": "Validation error",
  "errors": {}
}
```

## Health

- `GET /health`

## Finances

- `GET /api/finances/summary`
- `GET /api/finances/movements?type=expense&limit=20&offset=0`
- `POST /api/finances/movements`
- `GET /api/finances/upcoming-payments`
- `POST /api/finances/upcoming-payments`
- `PATCH /api/finances/upcoming-payments/:id/status`

Movement payload:

```json
{
  "type": "expense",
  "amount": 180,
  "category_id": "00000000-0000-0000-0000-000000000001",
  "description": "Comida",
  "movement_date": "2026-07-08",
  "payment_method": "card"
}
```

Upcoming payment payload:

```json
{
  "name": "Internet",
  "amount": 599,
  "due_date": "2026-07-12",
  "category": "Servicios",
  "repeat_type": "monthly",
  "notes": "Cargo automático"
}
```

Status payload:

```json
{
  "status": "paid"
}
```

## Subscriptions

- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `PATCH /api/subscriptions/:id`
- `DELETE /api/subscriptions/:id`
- `PATCH /api/subscriptions/:id/status`

Payload:

```json
{
  "name": "Spotify",
  "amount": 129,
  "billing_day": 9,
  "frequency": "monthly",
  "category": "Música",
  "notes": "Plan individual"
}
```

Status payload:

```json
{
  "status": "paused"
}
```

## Debts

- `GET /api/debts`
- `POST /api/debts`
- `PATCH /api/debts/:id`
- `DELETE /api/debts/:id`
- `POST /api/debts/:id/payments`

Debt payload:

```json
{
  "name": "Carlos",
  "type": "they_owe_me",
  "total_amount": 500,
  "pending_amount": 500,
  "due_date": "2026-07-15",
  "notes": "Comida pendiente"
}
```

Payment payload:

```json
{
  "amount": 200,
  "payment_date": "2026-07-09",
  "notes": "Abono"
}
```

## Calendar

- `GET /api/calendar/events?from=2026-07-01&to=2026-07-31`
- `POST /api/calendar/events`
- `PATCH /api/calendar/events/:id`
- `DELETE /api/calendar/events/:id`
- `PATCH /api/calendar/events/:id/status`

Payload:

```json
{
  "title": "Cita dental",
  "description": "Revisión general",
  "start_at": "2026-07-10T17:00:00.000Z",
  "end_at": "2026-07-10T18:00:00.000Z",
  "location_name": "Clínica",
  "repeat_type": "none"
}
```

Status payload:

```json
{
  "status": "completed"
}
```

## Tasks

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PATCH /api/tasks/:id/status`

Payload:

```json
{
  "title": "Revisar gastos",
  "description": "Cerrar la semana",
  "due_date": "2026-07-10",
  "priority": "high"
}
```

## Reminders

- `GET /api/reminders`
- `POST /api/reminders`
- `PATCH /api/reminders/:id`
- `DELETE /api/reminders/:id`
- `PATCH /api/reminders/:id/status`

Payload:

```json
{
  "title": "Pagar gym",
  "description": "Antes de las 7 PM",
  "remind_at": "2026-07-08T19:00:00.000Z",
  "repeat_type": "none"
}
```

## Inbox

- `POST /api/inbox/interpret`

Payload:

```json
{
  "text": "Gasté 180 en comida"
}
```

Response data:

```json
{
  "intent": "create_expense",
  "confidence": 0.85,
  "payload": {
    "type": "expense",
    "amount": 180,
    "description": "Gasté 180 en comida"
  }
}
```

## Auth, AI, Sync

Skeleton routes still exist for:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/ai/parse-action`
- `POST /api/ai/daily-summary`
- `POST /api/sync/push`
- `GET /api/sync/pull`
