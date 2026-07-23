import { deleteCapture } from "@/db/captures";

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
    const deleted = await deleteCapture(id);
    if (!deleted) {
      return Response.json(
        { error: "La captura ya no existe." },
        { status: 404 },
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete capture", error);
    return Response.json(
      { error: "No fue posible eliminar la captura." },
      { status: 500 },
    );
  }
}
