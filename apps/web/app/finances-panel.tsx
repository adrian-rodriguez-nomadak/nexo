"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AccountType = "cash" | "bank" | "savings" | "credit";
type TransactionKind = "income" | "expense";

type FinanceAccount = {
  id: string;
  name: string;
  type: AccountType;
  currency: "MXN";
  initialBalanceCents: number;
  balanceCents: number;
  createdAt: string;
};

type FinanceTransaction = {
  id: string;
  accountId: string;
  accountName: string;
  kind: TransactionKind;
  category: string;
  description: string;
  amountCents: number;
  occurredAt: string;
  createdAt: string;
};

type FinanceSummary = {
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

type FinanceData = {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  summary: FinanceSummary;
};

const emptySummary: FinanceSummary = {
  balanceCents: 0,
  incomeCents: 0,
  expenseCents: 0,
  netCents: 0,
};

const accountTypeLabels: Record<AccountType, string> = {
  cash: "Efectivo",
  bank: "Banco",
  savings: "Ahorro",
  credit: "Crédito",
};

const categories: Record<TransactionKind, string[]> = {
  income: ["Sueldo", "Venta", "Reembolso", "Rendimiento", "Otro ingreso"],
  expense: [
    "Comida",
    "Transporte",
    "Hogar",
    "Salud",
    "Entretenimiento",
    "Apuestas",
    "Otro gasto",
  ],
};

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

function parseMoneyToCents(value: string): number | null {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return 0;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function todayInputValue(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

async function fetchFinances(): Promise<FinanceData> {
  const response = await fetch("/api/finances");
  const data = (await response.json()) as Partial<FinanceData> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "No fue posible cargar Finanzas.");
  }

  return {
    accounts: data.accounts ?? [],
    transactions: data.transactions ?? [],
    summary: data.summary ?? emptySummary,
  };
}

export function FinancesPanel() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("bank");
  const [initialBalance, setInitialBalance] = useState("");

  const [kind, setKind] = useState<TransactionKind>("expense");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories.expense[0]);
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayInputValue);

  const loadFinances = useCallback(async () => {
    const data = await fetchFinances();
    const nextAccounts = data.accounts;
    setAccounts(nextAccounts);
    setTransactions(data.transactions);
    setSummary(data.summary);
    setAccountId((current) => current || nextAccounts[0]?.id || "");
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeFinances() {
      try {
        const data = await fetchFinances();
        if (!active) return;

        setAccounts(data.accounts);
        setTransactions(data.transactions);
        setSummary(data.summary);
        setAccountId(data.accounts[0]?.id ?? "");
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar Finanzas.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void initializeFinances();

    return () => {
      active = false;
    };
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId),
    [accountId, accounts],
  );

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const initialBalanceCents = parseMoneyToCents(initialBalance);

    if (accountName.trim().length < 2 || initialBalanceCents === null) {
      setError("Revisa el nombre y saldo inicial de la cuenta.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/finances/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: accountName,
          type: accountType,
          initialBalanceCents,
        }),
      });
      const data = (await response.json()) as {
        account?: FinanceAccount;
        error?: string;
      };

      if (!response.ok || !data.account) {
        throw new Error(data.error ?? "No fue posible crear la cuenta.");
      }

      setAccountName("");
      setInitialBalance("");
      setAccountId(data.account.id);
      await loadFinances();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible crear la cuenta.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = parseMoneyToCents(amount);

    if (
      !accountId ||
      !amountCents ||
      amountCents < 1 ||
      description.trim().length < 2
    ) {
      setError("Completa la cuenta, concepto y monto del movimiento.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/finances/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId,
          kind,
          category,
          description,
          amountCents,
          occurredAt: new Date(`${occurredAt}T12:00:00`).toISOString(),
        }),
      });
      const data = (await response.json()) as {
        transaction?: FinanceTransaction;
        error?: string;
      };

      if (!response.ok || !data.transaction) {
        throw new Error(data.error ?? "No fue posible guardar el movimiento.");
      }

      setDescription("");
      setAmount("");
      await loadFinances();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar el movimiento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeTransaction(id: string) {
    const previous = transactions;
    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== id),
    );
    setError(null);

    try {
      const response = await fetch(`/api/finances/transactions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      await loadFinances();
    } catch {
      setTransactions(previous);
      setError("No fue posible eliminar el movimiento.");
    }
  }

  function selectKind(nextKind: TransactionKind) {
    setKind(nextKind);
    setCategory(categories[nextKind][0]);
  }

  return (
    <section className="finance-workspace">
      <div className="finance-summary-grid">
        <article className="finance-balance-card">
          <span className="finance-kicker">Balance total</span>
          <strong>{formatMoney(summary.balanceCents)}</strong>
          <div className="finance-balance-footer">
            <span>
              <i className="finance-dot income-dot" />
              Ingresos {formatMoney(summary.incomeCents)}
            </span>
            <span>
              <i className="finance-dot expense-dot" />
              Gastos {formatMoney(summary.expenseCents)}
            </span>
          </div>
        </article>
        <article className="finance-stat-card">
          <span>Flujo neto</span>
          <strong
            className={summary.netCents < 0 ? "negative-money" : "positive-money"}
          >
            {formatMoney(summary.netCents)}
          </strong>
          <p>Ingresos menos gastos registrados</p>
        </article>
        <article className="finance-stat-card">
          <span>Cuentas</span>
          <strong>{accounts.length}</strong>
          <p>{transactions.length} movimientos en total</p>
        </article>
      </div>

      {error ? (
        <div className="finance-alert" role="alert">
          {error}
          <button onClick={() => setError(null)} type="button">
            ×
          </button>
        </div>
      ) : null}

      <div className="finance-editor-grid">
        <form className="finance-form-card" onSubmit={submitTransaction}>
          <div className="finance-card-heading">
            <div>
              <span className="eyebrow">Movimiento</span>
              <h2>Registrar dinero</h2>
            </div>
            <div className="kind-switch" role="group" aria-label="Tipo">
              <button
                className={kind === "expense" ? "kind-active" : ""}
                onClick={() => selectKind("expense")}
                type="button"
              >
                Gasto
              </button>
              <button
                className={kind === "income" ? "kind-active" : ""}
                onClick={() => selectKind("income")}
                type="button"
              >
                Ingreso
              </button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="finance-empty-inline">
              <span>$</span>
              <div>
                <strong>Crea una cuenta primero</strong>
                <p>Después podrás registrar ingresos y gastos.</p>
              </div>
            </div>
          ) : (
            <div className="finance-fields">
              <label className="money-field">
                <span>Monto</span>
                <div>
                  <span>$</span>
                  <input
                    data-testid="transaction-amount"
                    inputMode="decimal"
                    min="0.01"
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={amount}
                  />
                  <small>MXN</small>
                </div>
              </label>
              <label>
                <span>Concepto</span>
                <input
                  data-testid="transaction-description"
                  maxLength={120}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={
                    kind === "expense" ? "Cena con amigos" : "Pago de nómina"
                  }
                  value={description}
                />
              </label>
              <div className="finance-field-row">
                <label>
                  <span>Cuenta</span>
                  <select
                    aria-label="Cuenta"
                    onChange={(event) => setAccountId(event.target.value)}
                    value={accountId}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Categoría</span>
                  <select
                    aria-label="Categoría"
                    onChange={(event) => setCategory(event.target.value)}
                    value={category}
                  >
                    {categories[kind].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Fecha</span>
                  <input
                    aria-label="Fecha"
                    onChange={(event) => setOccurredAt(event.target.value)}
                    type="date"
                    value={occurredAt}
                  />
                </label>
              </div>
              <button
                className="finance-primary-button"
                data-testid="save-transaction"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Guardando…" : `Guardar ${kind === "expense" ? "gasto" : "ingreso"}`}
              </button>
            </div>
          )}
        </form>

        <form className="accounts-card" onSubmit={submitAccount}>
          <div className="finance-card-heading">
            <div>
              <span className="eyebrow">Patrimonio</span>
              <h2>Tus cuentas</h2>
            </div>
            <span className="record-count">{accounts.length} activas</span>
          </div>

          <div className="account-list">
            {isLoading ? (
              <div className="account-loading">Cargando cuentas…</div>
            ) : accounts.length === 0 ? (
              <p className="account-empty">Aún no tienes cuentas.</p>
            ) : (
              accounts.map((account) => (
                <article
                  className={`account-item ${selectedAccount?.id === account.id ? "account-item-selected" : ""}`}
                  key={account.id}
                >
                  <button
                    onClick={() => setAccountId(account.id)}
                    type="button"
                  >
                    <span className="account-mark">
                      {account.type === "cash" ? "$" : account.name.slice(0, 2)}
                    </span>
                    <span>
                      <strong>{account.name}</strong>
                      <small>{accountTypeLabels[account.type]}</small>
                    </span>
                    <b>{formatMoney(account.balanceCents)}</b>
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="new-account-fields">
            <span className="new-account-title">Nueva cuenta</span>
            <label>
              <span>Nombre</span>
              <input
                data-testid="account-name"
                maxLength={60}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Cuenta principal"
                value={accountName}
              />
            </label>
            <div className="finance-field-row account-field-row">
              <label>
                <span>Tipo</span>
                <select
                  aria-label="Tipo de cuenta"
                  onChange={(event) =>
                    setAccountType(event.target.value as AccountType)
                  }
                  value={accountType}
                >
                  {Object.entries(accountTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Saldo inicial</span>
                <input
                  data-testid="account-balance"
                  inputMode="decimal"
                  onChange={(event) => setInitialBalance(event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={initialBalance}
                />
              </label>
            </div>
            <button
              className="finance-secondary-button"
              disabled={isSaving || accountName.trim().length < 2}
              type="submit"
            >
              Agregar cuenta
            </button>
          </div>
        </form>
      </div>

      <section className="finance-transactions-card">
        <div className="finance-card-heading">
          <div>
            <span className="eyebrow">Historial</span>
            <h2>Movimientos recientes</h2>
          </div>
          <span className="record-count">
            {transactions.length}{" "}
            {transactions.length === 1 ? "movimiento" : "movimientos"}
          </span>
        </div>

        <div className="transaction-list">
          {isLoading ? (
            <div className="finance-list-empty">Cargando movimientos…</div>
          ) : transactions.length === 0 ? (
            <div className="finance-list-empty">
              <span>↗</span>
              <strong>Tu historial comienza aquí</strong>
              <p>Registra el primer ingreso o gasto para ver tu flujo.</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <article className="transaction-row" key={transaction.id}>
                <span
                  className={`transaction-mark ${transaction.kind === "income" ? "transaction-income" : "transaction-expense"}`}
                >
                  {transaction.kind === "income" ? "↙" : "↗"}
                </span>
                <div className="transaction-description">
                  <strong>{transaction.description}</strong>
                  <span>
                    {transaction.category} · {transaction.accountName}
                  </span>
                </div>
                <time dateTime={transaction.occurredAt}>
                  {dateFormatter.format(new Date(transaction.occurredAt))}
                </time>
                <b
                  className={
                    transaction.kind === "income"
                      ? "positive-money"
                      : "negative-money"
                  }
                >
                  {transaction.kind === "income" ? "+" : "−"}
                  {formatMoney(transaction.amountCents)}
                </b>
                <button
                  aria-label={`Eliminar movimiento: ${transaction.description}`}
                  className="delete-button"
                  onClick={() => void removeTransaction(transaction.id)}
                  type="button"
                >
                  ×
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
