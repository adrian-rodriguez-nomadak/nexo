import {
  createFinanceTransaction,
  isTransactionKind,
  isValidCents,
  normalizeLabel,
  normalizeOccurredAt,
} from "@/db/finances";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "La solicitud no es válida." },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return Response.json(
      { error: "Completa los datos del movimiento." },
      { status: 400 },
    );
  }

  const {
    accountId,
    kind,
    category,
    description,
    amountCents,
    occurredAt,
  } = payload as Record<string, unknown>;
  const normalizedAccountId =
    typeof accountId === "string" && accountId.length <= 100
      ? accountId
      : null;
  const normalizedCategory = normalizeLabel(category, 50);
  const normalizedDescription = normalizeLabel(description, 120);
  const normalizedOccurredAt = normalizeOccurredAt(occurredAt);

  if (
    !normalizedAccountId ||
    !isTransactionKind(kind) ||
    !normalizedCategory ||
    !normalizedDescription ||
    !isValidCents(amountCents) ||
    !normalizedOccurredAt
  ) {
    return Response.json(
      { error: "Revisa los datos del movimiento." },
      { status: 400 },
    );
  }

  try {
    const transaction = await createFinanceTransaction({
      accountId: normalizedAccountId,
      kind,
      category: normalizedCategory,
      description: normalizedDescription,
      amountCents,
      occurredAt: normalizedOccurredAt,
    });

    if (!transaction) {
      return Response.json(
        { error: "La cuenta seleccionada no existe." },
        { status: 404 },
      );
    }

    return Response.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("Unable to create finance transaction", error);
    return Response.json(
      { error: "No fue posible registrar el movimiento." },
      { status: 500 },
    );
  }
}
