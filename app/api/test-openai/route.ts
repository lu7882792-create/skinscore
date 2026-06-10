import OpenAI from "openai";
import { fetch, ProxyAgent } from "undici";

export const runtime = "nodejs";

const proxyUrl = process.env.OPENAI_PROXY_URL;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 180000,
  maxRetries: 0,
  fetch,
  fetchOptions: proxyUrl
    ? ({
        dispatcher: new ProxyAgent(proxyUrl),
      } as any)
    : undefined,
});

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          ok: false,
          error: "Missing OPENAI_API_KEY",
        },
        { status: 500 }
      );
    }

    if (process.env.OPENAI_API_KEY.includes("xxxxx")) {
      return Response.json(
        {
          ok: false,
          error:
            "OPENAI_API_KEY is still a placeholder. Please replace it with your real API key.",
        },
        { status: 500 }
      );
    }

    const response = await openai.responses.create(
      {
        model: "gpt-4o-mini",
        input: "Reply with only this text: OpenAI connected",
        max_output_tokens: 20,
      },
      {
        timeout: 180000,
      }
    );

    return Response.json({
      ok: true,
      proxyUrl,
      text: response.output_text,
    });
  } catch (error: any) {
    console.error("OpenAI test error full:", error);

    return Response.json(
      {
        ok: false,
        proxyUrl,
        errorMessage: error?.message,
        errorName: error?.name,
        status: error?.status,
        code: error?.code,
        type: error?.type,
      },
      { status: 500 }
    );
  }
}