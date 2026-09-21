import { NextResponse } from "next/server";
import { sendTelegramFeedback } from "@/lib/telegram";

interface FeedbackBody {
  name?: string;
  contact?: string;
  message?: string;
  website?: string; // honeypot
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FeedbackBody;

    // Honeypot: бот заполнил скрытое поле — тихо игнорируем
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    // Валидация: сообщение обязательно
    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Сообщение не может быть пустым" },
        { status: 400 },
      );
    }

    const lines: string[] = [];
    lines.push("📩 Новое сообщение с сайта");
    if (body.name?.trim()) {
      lines.push(`👤 Имя: ${body.name.trim()}`);
    }
    if (body.contact?.trim()) {
      lines.push(`📞 Контакт: ${body.contact.trim()}`);
    }
    lines.push(`💬 Сообщение:\n${body.message.trim()}`);

    await sendTelegramFeedback(lines.join("\n"));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[feedback] Ошибка отправки:", error);
    return NextResponse.json(
      { success: false, error: "Не удалось отправить" },
      { status: 500 },
    );
  }
}
