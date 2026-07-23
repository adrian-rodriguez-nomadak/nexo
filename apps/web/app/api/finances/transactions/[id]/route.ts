import { deleteFinanceTransaction } from "@/db/finances";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!id || id.length > 100) {
    return Response.json(
      { error: "El identificador no es válido." },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteFinanceTransaction(id);
    if (!deleted) {
      return Response.json(
        { error: "El movimiento ya no existe." },
        { status: 404 },
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete finance transaction", error);
    return Response.json(
      { error: "No fue posible eliminar el movimiento." },
      { status: 500 },
    );
  }
}
