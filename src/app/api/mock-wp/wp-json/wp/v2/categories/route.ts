import { NextRequest } from "next/server";
import { getCategories, validateMockAuth } from "@/lib/wordpress/mock-store";

export async function GET(req: NextRequest) {
  if (!validateMockAuth(req)) {
    return Response.json(
      { code: "rest_cannot_access", message: "Authentication required." },
      { status: 401 }
    );
  }

  return Response.json(getCategories());
}
