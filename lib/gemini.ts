import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import { business } from "@/data/business";

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export const IMAGE_DISCLAIMER =
  "Для более точной информации свяжитесь по номеру или оставьте свои данные через обратную связь";

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const comma = dataUrl.indexOf(";base64,");
  if (comma < 0) return null;
  const mimeType = dataUrl.slice(5, comma);
  if (!mimeType.startsWith("image/")) return null;
  return { mimeType, data: dataUrl.slice(comma + 8) };
}

export async function askGemini(
  userMessage: string,
  image?: string,
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY не задан");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  });

  const roomLines = business.rooms
    .map((room) => `- ${room.title}: ${room.price}. ${room.text}`)
    .join("\n");
  const serviceLines = business.services
    .map((item) => `- ${item.title}: ${item.text}`)
    .join("\n");

  const system = `Ты сдержанный консьерж бутик-отеля ${business.name}.
Отвечай кратко и тепло на русском. Опирайся только на факты ниже, не выдумывай занятость номеров.
Телефон: ${business.phone}. Почта: ${business.email}. Адрес: ${business.address}.
Заезд ${business.checkIn}, выезд ${business.checkOut}. ${business.hours}.
Номера:
${roomLines}
Сервис:
${serviceLines}
Если просят бронь — предложи форму на сайте или звонок консьержу.`;

  const parsedImage = image ? parseDataUrl(image) : null;
  if (image && !parsedImage) {
    throw new Error("Некорректное изображение");
  }

  const parts: Part[] = [
    { text: system },
    ...(parsedImage ? [{ inlineData: parsedImage }] : []),
    { text: `Вопрос гостя: ${userMessage}` },
  ];

  const result = await model.generateContent(parts);
  const text = result.response.text()?.trim();
  if (!text) {
    throw new Error("Пустой ответ Gemini");
  }

  if (image) {
    return `${text}\n\n${IMAGE_DISCLAIMER}`;
  }

  return text;
}
