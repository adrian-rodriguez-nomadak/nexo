"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

type TransactionKind = "income" | "expense";

type SimulatorAccount = {
  id: string;
  name: string;
  balanceCents: number;
};

type SimulatorSummary = {
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

type SimulatedMovement = {
  id: string;
  accountId: string;
  kind: TransactionKind;
  category: string;
  description: string;
  amountCents: number;
};

type Diagnosis = {
  level: "healthy" | "attention" | "critical";
  title: string;
  summary: string;
  plan: string[];
};

const simulatedCategories: Record<TransactionKind, string[]> = {
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

function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

function parseMoneyToCents(value: string): number | null {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function movementId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `simulation-${Date.now()}`;
}

function buildDiagnosis(input: {
  accounts: Array<SimulatorAccount & { projectedBalanceCents: number }>;
  movements: SimulatedMovement[];
  projected: SimulatorSummary;
  simulatedIncomeCents: number;
  simulatedExpenseCents: number;
}): Diagnosis {
  const negativeAccounts = input.accounts.filter(
    (account) => account.projectedBalanceCents < 0,
  );
  const scenarioNetCents =
    input.simulatedIncomeCents - input.simulatedExpenseCents;
  const plan: string[] = [];

  if (negativeAccounts.length > 0) {
    const names = negativeAccounts.map((account) => account.name).join(", ");
    plan.push(
      `Evita que ${names} ${negativeAccounts.length === 1 ? "quede" : "queden"} en negativo; ajusta o mueve gastos antes de aplicar el escenario.`,
    );
  }

  if (scenarioNetCents < 0) {
    plan.push(
      `Compensa ${formatMoney(Math.abs(scenarioNetCents))} entre nuevos ingresos o gastos por recortar para que la simulación se sostenga sola.`,
    );
  } else if (scenarioNetCents > 0) {
    plan.push(
      `Aparta primero ${formatMoney(Math.round(scenarioNetCents * 0.2))}, equivalente al 20% del excedente simulado, como margen de seguridad.`,
    );
  }

  const largestExpense = input.movements
    .filter((movement) => movement.kind === "expense")
    .sort((left, right) => right.amountCents - left.amountCents)[0];
  if (largestExpense) {
    plan.push(
      `Revisa “${largestExpense.description}”, el gasto simulado más alto (${formatMoney(largestExpense.amountCents)}), y define su límite antes de ejecutarlo.`,
    );
  }

  if (input.projected.netCents < 0) {
    plan.push(
      `Tu flujo acumulado quedaría ${formatMoney(Math.abs(input.projected.netCents))} por debajo de cero; prioriza recuperar un flujo positivo.`,
    );
  } else {
    plan.push(
      "Si decides aplicar el escenario, registra cada movimiento real por separado para comparar el resultado con esta proyección.",
    );
  }

  if (negativeAccounts.length > 0 || input.projected.balanceCents < 0) {
    return {
      level: "critical",
      title: "El escenario necesita ajustes",
      summary:
        "La simulación deja al menos una cuenta sin fondos suficientes. Conviene corregir el orden o el monto de los movimientos.",
      plan,
    };
  }

  if (scenarioNetCents < 0 || input.projected.netCents < 0) {
    return {
      level: "attention",
      title: "Hay margen, pero el flujo se debilita",
      summary:
        "El escenario puede sostenerse con el saldo disponible, aunque aumenta la salida neta de dinero.",
      plan,
    };
  }

  return {
    level: "healthy",
    title: "El escenario conserva un flujo positivo",
    summary:
      "Los movimientos simulados no llevan cuentas a negativo y el balance proyectado mantiene margen.",
    plan,
  };
}

export function FinanceSimulator({
  accounts,
  summary,
}: {
  accounts: SimulatorAccount[];
  summary: SimulatorSummary;
}) {
  const [movements, setMovements] = useState<SimulatedMovement[]>([]);
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(simulatedCategories.expense[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);

  const effectiveAccountId = accounts.some(
    (account) => account.id === accountId,
  )
    ? accountId
    : (accounts[0]?.id ?? "");

  const simulation = useMemo(() => {
    const simulatedIncomeCents = movements
      .filter((movement) => movement.kind === "income")
      .reduce((total, movement) => total + movement.amountCents, 0);
    const simulatedExpenseCents = movements
      .filter((movement) => movement.kind === "expense")
      .reduce((total, movement) => total + movement.amountCents, 0);
    const projectedAccounts = accounts.map((account) => {
      const impactCents = movements
        .filter((movement) => movement.accountId === account.id)
        .reduce(
          (total, movement) =>
            total +
            (movement.kind === "income"
              ? movement.amountCents
              : -movement.amountCents),
          0,
        );
      return {
        ...account,
        impactCents,
        projectedBalanceCents: account.balanceCents + impactCents,
      };
    });
    const projected: SimulatorSummary = {
      balanceCents:
        summary.balanceCents +
        simulatedIncomeCents -
        simulatedExpenseCents,
      incomeCents: summary.incomeCents + simulatedIncomeCents,
      expenseCents: summary.expenseCents + simulatedExpenseCents,
      netCents:
        summary.netCents + simulatedIncomeCents - simulatedExpenseCents,
    };

    return {
      diagnosis: buildDiagnosis({
        accounts: projectedAccounts,
        movements,
        projected,
        simulatedIncomeCents,
        simulatedExpenseCents,
      }),
      projected,
      projectedAccounts,
      simulatedExpenseCents,
      simulatedIncomeCents,
    };
  }, [accounts, movements, summary]);

  function selectKind(nextKind: TransactionKind) {
    setKind(nextKind);
    setCategory(simulatedCategories[nextKind][0]);
  }

  function addMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = parseMoneyToCents(amount);

    if (
      !effectiveAccountId ||
      !amountCents ||
      description.trim().length < 2
    ) {
      setFormError("Completa la cuenta, el concepto y un monto mayor a cero.");
      return;
    }

    setMovements((current) => [
      ...current,
      {
        id: movementId(),
        accountId: effectiveAccountId,
        kind,
        category,
        description: description.trim(),
        amountCents,
      },
    ]);
    setDescription("");
    setAmount("");
    setFormError(null);
    setShowDiagnosis(false);
  }

  function removeMovement(id: string) {
    setMovements((current) =>
      current.filter((movement) => movement.id !== id),
    );
    setShowDiagnosis(false);
  }

  function resetSimulation() {
    setMovements([]);
    setShowDiagnosis(false);
    setFormError(null);
  }

  if (accounts.length === 0) {
    return (
      <section className="finance-simulator-empty">
        <span>◇</span>
        <h2>Crea una cuenta para comenzar</h2>
        <p>
          El simulador necesita un saldo real como punto de partida. Regresa al
          resumen, crea tu primera cuenta y vuelve aquí.
        </p>
      </section>
    );
  }

  return (
    <section className="finance-simulator" data-testid="finance-simulator">
      <div className="simulation-hero">
        <div>
          <span className="eyebrow">Escenario hipotético</span>
          <h2>Prueba decisiones sin mover tu dinero</h2>
          <p>
            Agrega ingresos y gastos temporales. Nada de esta simulación se
            guarda en tus movimientos reales.
          </p>
        </div>
        <div className="simulation-hero-actions">
          <span>{movements.length} en el escenario</span>
          <button
            disabled={movements.length === 0}
            onClick={resetSimulation}
            type="button"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <div className="simulation-summary-grid">
        <article className="simulation-balance-card">
          <span>Balance proyectado</span>
          <strong>{formatMoney(simulation.projected.balanceCents)}</strong>
          <p>
            Antes {formatMoney(summary.balanceCents)}
            <b
              className={
                simulation.projected.balanceCents - summary.balanceCents < 0
                  ? "negative-money"
                  : "positive-money"
              }
            >
              {simulation.projected.balanceCents - summary.balanceCents >= 0
                ? " +"
                : " "}
              {formatMoney(
                simulation.projected.balanceCents - summary.balanceCents,
              )}
            </b>
          </p>
        </article>
        <article>
          <span>Ingresos proyectados</span>
          <strong>{formatMoney(simulation.projected.incomeCents)}</strong>
          <p>+{formatMoney(simulation.simulatedIncomeCents)} simulados</p>
        </article>
        <article>
          <span>Gastos proyectados</span>
          <strong>{formatMoney(simulation.projected.expenseCents)}</strong>
          <p>+{formatMoney(simulation.simulatedExpenseCents)} simulados</p>
        </article>
        <article>
          <span>Flujo neto proyectado</span>
          <strong
            className={
              simulation.projected.netCents < 0
                ? "negative-money"
                : "positive-money"
            }
          >
            {formatMoney(simulation.projected.netCents)}
          </strong>
          <p>Ingresos menos gastos con el escenario</p>
        </article>
      </div>

      <div className="simulation-work-grid">
        <form className="simulation-form-card" onSubmit={addMovement}>
          <div className="finance-card-heading">
            <div>
              <span className="eyebrow">Nuevo supuesto</span>
              <h2>Simular movimiento</h2>
            </div>
            <div
              className="kind-switch"
              role="group"
              aria-label="Tipo de movimiento simulado"
            >
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

          <div className="simulation-fields">
            <label className="money-field">
              <span>Monto</span>
              <div>
                <span>$</span>
                <input
                  data-testid="simulation-amount"
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
                data-testid="simulation-description"
                maxLength={120}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={
                  kind === "expense"
                    ? "Compra o pago futuro"
                    : "Ingreso esperado"
                }
                value={description}
              />
            </label>
            <div className="simulation-field-row">
              <label>
                <span>Cuenta</span>
                <select
                  aria-label="Cuenta para simulación"
                  onChange={(event) => setAccountId(event.target.value)}
                  value={effectiveAccountId}
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
                  aria-label="Categoría simulada"
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  {simulatedCategories[kind].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {formError ? (
              <p className="simulation-form-error" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              className="finance-primary-button"
              data-testid="add-simulated-movement"
              type="submit"
            >
              Agregar a la simulación
            </button>
          </div>
        </form>

        <section className="simulation-accounts-card">
          <div className="finance-card-heading">
            <div>
              <span className="eyebrow">Resultado por cuenta</span>
              <h2>Así quedarían tus saldos</h2>
            </div>
          </div>
          <div className="simulation-account-list">
            {simulation.projectedAccounts.map((account) => (
              <article key={account.id}>
                <span className="account-mark">
                  {account.name.slice(0, 2)}
                </span>
                <div>
                  <strong>{account.name}</strong>
                  <small>
                    Actual {formatMoney(account.balanceCents)}
                    <b
                      className={
                        account.impactCents < 0
                          ? "negative-money"
                          : "positive-money"
                      }
                    >
                      {account.impactCents >= 0 ? " +" : " "}
                      {formatMoney(account.impactCents)}
                    </b>
                  </small>
                </div>
                <strong
                  className={
                    account.projectedBalanceCents < 0 ? "negative-money" : ""
                  }
                >
                  {formatMoney(account.projectedBalanceCents)}
                </strong>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="simulation-movements-card">
        <div className="finance-card-heading">
          <div>
            <span className="eyebrow">Escenario</span>
            <h2>Movimientos simulados</h2>
          </div>
          <span className="record-count">
            {movements.length}{" "}
            {movements.length === 1 ? "movimiento" : "movimientos"}
          </span>
        </div>
        {movements.length === 0 ? (
          <div className="simulation-list-empty">
            <span>＋</span>
            <strong>Construye tu escenario</strong>
            <p>Agrega uno o más supuestos para comparar el antes y el después.</p>
          </div>
        ) : (
          <div className="simulation-movement-list">
            {movements.map((movement) => {
              const account = accounts.find(
                (candidate) => candidate.id === movement.accountId,
              );
              return (
                <article key={movement.id}>
                  <span
                    className={`transaction-mark ${
                      movement.kind === "income"
                        ? "transaction-income"
                        : "transaction-expense"
                    }`}
                  >
                    {movement.kind === "income" ? "↙" : "↗"}
                  </span>
                  <div>
                    <strong>{movement.description}</strong>
                    <span>
                      {movement.category} · {account?.name ?? "Cuenta"}
                    </span>
                  </div>
                  <b
                    className={
                      movement.kind === "income"
                        ? "positive-money"
                        : "negative-money"
                    }
                  >
                    {movement.kind === "income" ? "+" : "−"}
                    {formatMoney(movement.amountCents)}
                  </b>
                  <button
                    aria-label={`Quitar movimiento simulado: ${movement.description}`}
                    className="delete-button"
                    onClick={() => removeMovement(movement.id)}
                    type="button"
                  >
                    ×
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="simulation-diagnosis-card">
        <div className="simulation-diagnosis-intro">
          <span className="diagnosis-icon">◎</span>
          <div>
            <span className="eyebrow">Lectura del escenario</span>
            <h2>Diagnóstico financiero</h2>
            <p>
              Convierte el impacto de la simulación en prioridades concretas.
            </p>
          </div>
          <button
            data-testid="run-finance-diagnosis"
            disabled={movements.length === 0}
            onClick={() => setShowDiagnosis(true)}
            type="button"
          >
            {showDiagnosis ? "Actualizar diagnóstico" : "Ver diagnóstico"}
          </button>
        </div>

        {showDiagnosis ? (
          <div
            className={`diagnosis-result diagnosis-${simulation.diagnosis.level}`}
            data-testid="finance-diagnosis"
          >
            <div className="diagnosis-result-heading">
              <span>
                {simulation.diagnosis.level === "healthy"
                  ? "Escenario viable"
                  : simulation.diagnosis.level === "attention"
                    ? "Requiere atención"
                    : "Riesgo alto"}
              </span>
              <h3>{simulation.diagnosis.title}</h3>
              <p>{simulation.diagnosis.summary}</p>
            </div>
            <div className="diagnosis-plan">
              <span>Plan sugerido</span>
              <ol>
                {simulation.diagnosis.plan.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <small>
              Orientación basada únicamente en los datos de este escenario; no
              sustituye asesoría financiera profesional.
            </small>
          </div>
        ) : null}
      </section>
    </section>
  );
}
