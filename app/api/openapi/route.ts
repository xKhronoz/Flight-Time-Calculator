import { NextResponse } from "next/server";
import openapi from "@/openapi.json";

export async function GET() {
  // Serve the generated OpenAPI JSON so tools like Swagger UI can fetch it.
  return NextResponse.json(openapi);
}
