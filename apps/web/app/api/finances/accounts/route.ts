import {
  createFinanceAccount,
  isAccountType,
  isValidCents,
  normalizeLabel,
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
      { error: "Completa los datos de la cuenta." },
      { status: 400 },
    );
  }

  const { name, type, initialBalanceCents } = payload as Record<
    string,
    unknown
  >;
  const normalizedName = normalizeLabel(name, 60);

  if (!normalizedName || !isAccountType(type)) {
    return Response.json(
      { error: "El nombre o tipo de cuenta no es válido." },
      { status: 400 },
    );
  }

  if (
    !isValidCents(initialBalanceCents, {
      allowNegative: true,
    })
  ) {
    return Response.json(
      { error: "El saldo inicial no es válido." },
      { status: 400 },
    );
  }

  try {
    const account = await createFinanceAccount({
      name: normalizedName,
      type,
      initialBalanceCents,
    });
    return Response.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Unable to create finance account", error);
    return Response.json(
      { error: "No fue posible crear la cuenta." },
      { status: 500 },
    );
  }
}
