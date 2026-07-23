import { type NextRequest } from "next/server";

import {
  createCapture,
  isModuleKey,
  listCaptures,
  normalizeCaptureContent,
} from "@/db/captures";

export async function GET(request: NextRequest) {
  const requestedModule = request.nextUrl.searchParams.get("module");

  if (requestedModule && !isModuleKey(requestedModule)) {
    return Response.json(
      { error: "El módulo solicitado no existe." },
      { status: 400 },
    );
  }

  try {
    const captures = await listCaptures(requestedModule || undefined);
    return Response.json({ captures });
  } catch (error) {
    console.error("Unable to list captures", error);
    return Response.json(
      { error: "No fue posible consultar las capturas." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "El cuerpo de la solicitud no es válido." },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return Response.json(
      { error: "La captura no es válida." },
      { status: 400 },
    );
  }

  const { module, content } = payload as Record<string, unknown>;
  const normalizedContent = normalizeCaptureContent(content);

  if (!isModuleKey(module)) {
    return Response.json(
      { error: "Selecciona un módulo válido." },
      { status: 400 },
    );
  }

  if (!normalizedContent) {
    return Response.json(
      { error: "Escribe entre 2 y 500 caracteres." },
      { status: 400 },
    );
  }

  try {
    const capture = await createCapture({
      module,
      content: normalizedContent,
    });
    return Response.json({ capture }, { status: 201 });
  } catch (error) {
    console.error("Unable to create capture", error);
    return Response.json(
      { error: "No fue posible guardar la captura." },
      { status: 500 },
    );
  }
}
