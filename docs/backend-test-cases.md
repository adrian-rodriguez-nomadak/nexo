# Backend Test Cases

Use these examples with the backend running on `http://localhost:3000`.

## Health

```bash
curl http://localhost:3000/health
```

## Finances Summary

```bash
curl http://localhost:3000/api/finances/summary
```

## Create Movement

```bash
curl -X POST http://localhost:3000/api/finances/movements \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount": 180,
    "description": "Comida",
    "movement_date": "2026-07-09",
    "payment_method": "card"
  }'
```

## Create Calendar Event

```bash
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cita dental",
    "description": "Revisión general",
    "start_at": "2026-07-10T17:00:00.000Z",
    "end_at": "2026-07-10T18:00:00.000Z",
    "location_name": "Clínica",
    "repeat_type": "none"
  }'
```

## Create Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Revisar gastos",
    "description": "Cerrar la semana",
    "due_date": "2026-07-10",
    "priority": "high"
  }'
```

## Create Reminder

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pagar gym",
    "description": "Antes de las 7 PM",
    "remind_at": "2026-07-08T19:00:00.000Z",
    "repeat_type": "none"
  }'
```

## Create Subscription

```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spotify",
    "amount": 129,
    "billing_day": 9,
    "frequency": "monthly",
    "category": "Música",
    "notes": "Plan individual"
  }'
```

## Create Debt

```bash
curl -X POST http://localhost:3000/api/debts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos",
    "type": "they_owe_me",
    "total_amount": 500,
    "pending_amount": 500,
    "due_date": "2026-07-15",
    "notes": "Comida pendiente"
  }'
```

## Interpret Inbox Text

```bash
curl -X POST http://localhost:3000/api/inbox/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Gasté 180 en comida"
  }'
```
