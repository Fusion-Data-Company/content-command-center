import { getSiteInfo } from "@/lib/wordpress/mock-store";

export async function GET() {
  return Response.json(getSiteInfo());
}
