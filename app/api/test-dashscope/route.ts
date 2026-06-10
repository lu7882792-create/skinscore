import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  timeout: 180000,
  maxRetries: 0,
});

export async function GET() {
  try {
    if (!process.env.DASHSCOPE_API_KEY) {
      return Response.json(
        {
          ok: false,
          error: "Missing DASHSCOPE_API_KEY",
        },
        { status: 500 }
      );
    }

    const response = await client.chat.completions.create({
      model: "qwen-plus",
      messages: [
        {
          role: "user",
          content: "只回复这句话：DashScope connected",
        },
      ],
    });

    return Response.json({
      ok: true,
      text: response.choices[0]?.message?.content,
    });
  } catch (error: any) {
    console.error("DashScope test error:", error);

    return Response.json(
      {
        ok: false,
        errorMessage: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type,
      },
      { status: 500 }
    );
  }
}