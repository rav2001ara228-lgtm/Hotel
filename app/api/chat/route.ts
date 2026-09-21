import { NextResponse } from "next/server";
import { getFallbackResponse } from "@/lib/chatBot";
import { askGemini, isGeminiConfigured } from "@/lib/gemini";
import { findAnswer, trackUnansweredQuestion } from "@/lib/qaMatch";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: string; image?: string };
    const message = body.message?.trim() || "Что изображено на фото? Что меня интересует?";
    const image = body.image?.trim();

    if (image) {
      if (!isGeminiConfigured()) {
        return NextResponse.json({ reply: getFallbackResponse() });
      }

      try {
        const reply = await askGemini(message, image);
        void trackUnansweredQuestion(`[фото] ${message.slice(0, 200)}`, reply).catch(
          () => undefined,
        );
        return NextResponse.json({ reply });
      } catch {
        return NextResponse.json(
          { error: "Ошибка Gemini", reply: getFallbackResponse() },
          { status: 502 },
        );
      }
    }

    const faqAnswer = await findAnswer(message);
    if (faqAnswer) {
      return NextResponse.json({ reply: faqAnswer });
    }

    if (!isGeminiConfigured()) {
      void trackUnansweredQuestion(message).catch(() => undefined);
      return NextResponse.json({ reply: getFallbackResponse() });
    }

    try {
      const reply = await askGemini(message);
      void trackUnansweredQuestion(message, reply).catch(() => undefined);
      return NextResponse.json({ reply });
    } catch {
      void trackUnansweredQuestion(message).catch(() => undefined);
      return NextResponse.json(
        { error: "Ошибка Gemini", reply: getFallbackResponse() },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Не удалось обработать запрос" }, { status: 500 });
  }
}
