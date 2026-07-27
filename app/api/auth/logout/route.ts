import { apiSuccess } from "@/lib/api-response";
import { SESSION_COOKIE_NAME } from "@/lib/authorize";

export async function POST() {
  const response = apiSuccess("Logged out successfully");
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
