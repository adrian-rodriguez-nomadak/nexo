import "./models.js";

import { CalendarEvent } from "../../modules/calendar/calendar-event.model.js";
import { Debt } from "../../modules/debts/models/debt.model.js";
import { FinanceMovement } from "../../modules/finances/models/finance-movement.model.js";
import { UpcomingPayment } from "../../modules/finances/models/upcoming-payment.model.js";
import { Reminder } from "../../modules/reminders/reminder.model.js";
import { Subscription } from "../../modules/subscriptions/subscription.model.js";
import { Task } from "../../modules/tasks/task.model.js";
import { User } from "../../modules/users/user.model.js";
import { DEMO_USER_ID } from "../constants/demo-user.js";
import { sequelize } from "./sequelize.js";

async function seedDemo() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  await User.upsert({
    id: DEMO_USER_ID,
    name: "Adrián",
    email: "demo@nexo.local",
    currency: "MXN",
    budget_type: "biweekly",
  });

  await FinanceMovement.destroy({ where: { user_id: DEMO_USER_ID } });
  await UpcomingPayment.destroy({ where: { user_id: DEMO_USER_ID } });
  await Subscription.destroy({ where: { user_id: DEMO_USER_ID } });
  await Debt.destroy({ where: { user_id: DEMO_USER_ID } });
  await CalendarEvent.destroy({ where: { user_id: DEMO_USER_ID } });
  await Task.destroy({ where: { user_id: DEMO_USER_ID } });
  await Reminder.destroy({ where: { user_id: DEMO_USER_ID } });

  await FinanceMovement.bulkCreate([
    {
      user_id: DEMO_USER_ID,
      type: "income",
      amount: 12000,
      description: "Nómina quincenal",
      movement_date: "2026-07-01",
      payment_method: "transfer",
    },
    {
      user_id: DEMO_USER_ID,
      type: "expense",
      amount: 480,
      description: "Super",
      movement_date: "2026-07-04",
      payment_method: "card",
    },
    {
      user_id: DEMO_USER_ID,
      type: "expense",
      amount: 180,
      description: "Comida",
      movement_date: "2026-07-08",
      payment_method: "cash",
    },
  ]);

  await UpcomingPayment.bulkCreate([
    {
      user_id: DEMO_USER_ID,
      name: "Renta",
      amount: 6500,
      due_date: "2026-07-15",
      category: "Hogar",
      repeat_type: "monthly",
    },
    {
      user_id: DEMO_USER_ID,
      name: "Internet",
      amount: 599,
      due_date: "2026-07-12",
      category: "Servicios",
      repeat_type: "monthly",
    },
    {
      user_id: DEMO_USER_ID,
      name: "Tarjeta",
      amount: 2100,
      due_date: "2026-07-20",
      category: "Crédito",
      repeat_type: "none",
    },
  ]);

  await Subscription.bulkCreate([
    {
      user_id: DEMO_USER_ID,
      name: "Spotify",
      amount: 129,
      billing_day: 9,
      frequency: "monthly",
      category: "Música",
    },
    {
      user_id: DEMO_USER_ID,
      name: "Netflix",
      amount: 249,
      billing_day: 12,
      frequency: "monthly",
      category: "Streaming",
    },
    {
      user_id: DEMO_USER_ID,
      name: "iCloud",
      amount: 49,
      billing_day: 3,
      frequency: "monthly",
      category: "Cloud",
    },
    {
      user_id: DEMO_USER_ID,
      name: "Notion",
      amount: 180,
      billing_day: 22,
      frequency: "monthly",
      category: "Productividad",
    },
  ]);

  await Debt.bulkCreate([
    {
      user_id: DEMO_USER_ID,
      name: "Carlos",
      type: "they_owe_me",
      total_amount: 500,
      pending_amount: 500,
      due_date: "2026-07-15",
    },
    {
      user_id: DEMO_USER_ID,
      name: "Tarjeta azul",
      type: "i_owe",
      total_amount: 3200,
      pending_amount: 1900,
      due_date: "2026-07-28",
    },
    {
      user_id: DEMO_USER_ID,
      name: "Ana",
      type: "they_owe_me",
      total_amount: 750,
      pending_amount: 250,
    },
    {
      user_id: DEMO_USER_ID,
      name: "Préstamo personal",
      type: "i_owe",
      total_amount: 8000,
      pending_amount: 8000,
      due_date: "2026-08-10",
    },
  ]);

  await CalendarEvent.bulkCreate([
    {
      user_id: DEMO_USER_ID,
      title: "Cita dental",
      start_at: "2026-07-10T17:00:00.000Z",
      end_at: "2026-07-10T18:00:00.000Z",
      location_name: "Clínica",
      repeat_type: "none",
    },
    {
      user_id: DEMO_USER_ID,
      title: "Revisión de presupuesto",
      start_at: "2026-07-11T15:00:00.000Z",
      repeat_type: "weekly",
    },
    {
      user_id: DEMO_USER_ID,
      title: "Cena familiar",
      start_at: "2026-07-13T02:00:00.000Z",
      repeat_type: "none",
    },
  ]);

  await Task.bulkCreate([
    {
      user_id: DEMO_USER_ID,
      title: "Revisar gastos de la semana",
      due_date: "2026-07-10",
      priority: "high",
    },
    {
      user_id: DEMO_USER_ID,
      title: "Enviar comprobante",
      due_date: "2026-07-12",
      priority: "medium",
    },
    {
      user_id: DEMO_USER_ID,
      title: "Actualizar lista del súper",
      priority: "low",
    },
  ]);

  await Reminder.bulkCreate([
    {
      user_id: DEMO_USER_ID,
      title: "Pagar internet",
      remind_at: "2026-07-12T14:00:00.000Z",
      repeat_type: "monthly",
    },
    {
      user_id: DEMO_USER_ID,
      title: "Llamar al banco",
      remind_at: "2026-07-10T20:00:00.000Z",
      repeat_type: "none",
    },
    {
      user_id: DEMO_USER_ID,
      title: "Tomar lectura de medidor",
      remind_at: "2026-07-14T16:00:00.000Z",
      repeat_type: "monthly",
    },
  ]);

  console.log("Demo seed completed.");
}

seedDemo()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
