import { NextRequest } from "next/server";
import { createMedia, validateMockAuth } from "@/lib/wordpress/mock-store";

export async function POST(req: NextRequest) {
  if (!validateMockAuth(req)) {
    return Response.json(
      { code: "rest_cannot_access", message: "Authentication required." },
      { status: 401 }
    );
  }

  // Extract filename from Content-Disposition header
  const disposition = req.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] || "upload.jpg";

  // Consume the body (discard actual bytes)
  await req.arrayBuffer();

  const entry = createMedia(filename);
  return Response.json(entry, { status: 201 });
}
