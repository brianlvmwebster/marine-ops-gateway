import { startMicrosoftLogin } from "@floot/microsoft-login";

export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = url.protocol + "//" + url.host;
  const { authorizeUrl } = await startMicrosoftLogin(baseUrl);
  return new Response("Redirecting to Microsoft...", {
    status: 302,
    headers: { Location: authorizeUrl },
  });
}

