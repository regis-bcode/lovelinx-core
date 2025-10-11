import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { google } from "npm:googleapis@126.0.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExportRequestBody = {
  spreadsheetId?: string;
  range?: string;
  values?: unknown;
  valueInputOption?: string;
};

type SheetValues = string[][];

type ErrorResponse = {
  ok: false;
  error: string;
};

type SuccessResponse = {
  ok: true;
};

const ensureValues = (values: unknown): SheetValues => {
  if (!Array.isArray(values)) {
    throw new Error("Formato de dados inválido. Esperado um array de linhas.");
  }

  return values.map((row) => {
    if (!Array.isArray(row)) {
      throw new Error("Cada linha da planilha deve ser um array.");
    }

    return row.map((cell) => (cell == null ? "" : String(cell)));
  });
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Método não permitido", { status: 405, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ExportRequestBody;
    const spreadsheetId = body.spreadsheetId?.trim();
    const range = body.range?.trim();
    const values = ensureValues(body.values);

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ ok: false, error: "ID da planilha não informado." } satisfies ErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (!range) {
      return new Response(
        JSON.stringify({ ok: false, error: "Intervalo da planilha não informado." } satisfies ErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (!values.length) {
      return new Response(
        JSON.stringify({ ok: false, error: "Nenhum dado disponível para exportação." } satisfies ErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const serviceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

    if (!serviceAccountEmail || !serviceAccountKey) {
      console.error("Google Sheets credentials missing");
      return new Response(
        JSON.stringify({ ok: false, error: "Credenciais do Google não configuradas." } satisfies ErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const normalizedKey = serviceAccountKey.replace(/\\n/g, "\n");

    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    const jwtClient = new google.auth.JWT(serviceAccountEmail, undefined, normalizedKey, scopes);

    await jwtClient.authorize();

    const sheets = google.sheets({ version: "v4", auth: jwtClient });
    const valueInputOption =
      typeof body.valueInputOption === "string" && body.valueInputOption.toUpperCase() === "RAW"
        ? "RAW"
        : "USER_ENTERED";

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody: { values },
    });

    return new Response(JSON.stringify({ ok: true } satisfies SuccessResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("export-google-sheet error", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ ok: false, error: message } satisfies ErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
