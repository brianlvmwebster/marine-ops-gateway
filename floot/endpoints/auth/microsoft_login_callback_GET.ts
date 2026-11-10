import { handleMicrosoftLoginCallback } from "@floot/microsoft-login";
import { db } from "../../helpers/db";

export async function handle(request: Request): Promise<Response> {
  return handleMicrosoftLoginCallback(db, request);
}

