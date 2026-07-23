import { getFinances } from "@/db/finances";

export async function GET() {
  try {
    return Response.json(await getFinances());
  } catch (error) {
    console.error("Unable to load finances", error);
    return Response.json(
      { error: "No fue posible consultar tus finanzas." },
      { status: 500 },
    );
  }
}
