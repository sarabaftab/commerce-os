import { jsonOk } from "@/shared/http/json";

export async function GET() {
  return jsonOk({
    status: "ok",
    service: "commerce-os",
    time: new Date().toISOString(),
  });
}
