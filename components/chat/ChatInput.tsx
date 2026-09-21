"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ChatInputProps = {
  disabled: boolean;
  onSend: (text: string, image?: string) => void;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: {
        isFinal: boolean;
        0: { transcript: string };
      };
    };
  }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const anyWindow = window as unknown as Record<string, unknown>;
  const Ctor = (anyWindow.SpeechRecognition ||
    anyWindow.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  return Ctor ? new Ctor() : null;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    [],
  );

  function submit() {
    const text = value.trim();
    if ((!text && !image) || disabled) return;
    onSend(text, image ?? undefined);
    setValue("");
    setImage(null);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function onPickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      ref.current?.focus();
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, i) => event.results[i][0].transcript,
      ).join("");
      setValue((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    setListening(true);
    recognition.start();
  }

  const canSubmit = disabled || (!value.trim() && !image);

  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-vespera-border p-3"
    >
      {image ? (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Прикреплённое фото"
              className="h-16 w-16 rounded-vespera-sm border border-vespera-border object-cover"
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label="Убрать фото"
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-vespera-accent text-xs font-bold text-[#1a1712] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vespera-accent"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-vespera-text/70">Фото прикреплено</p>
        </div>
      ) : null}

      <div className="grid grid-cols-[auto_1fr_auto_auto] items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickImage}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          aria-label="Прикрепить фото"
          title="Прикрепить фото"
          className="rounded-vespera-sm border border-vespera-border px-2.5 py-2.5 text-sm leading-none transition hover:border-vespera-border-strong hover:text-vespera-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vespera-accent disabled:opacity-50"
        >
          📷
        </button>
        <button
          type="button"
          onClick={toggleMic}
          disabled={disabled}
          aria-label="Голосовой ввод"
          title="Голосовой ввод"
          className={`rounded-vespera-sm border px-2.5 py-2.5 text-sm leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vespera-accent disabled:opacity-50 ${
            listening
              ? "border-vespera-accent bg-vespera-accent/20 text-vespera-accent"
              : "border-vespera-border hover:border-vespera-border-strong hover:text-vespera-accent"
          }`}
        >
          {listening ? "◉" : "🎤"}
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={listening ? "Слушаю…" : "Ваш вопрос…"}
          aria-label="Сообщение консьержу"
          className="min-h-11 resize-none rounded-vespera-sm border border-vespera-border bg-vespera-bg/65 px-3 py-2.5 text-sm text-vespera-text outline-none focus-visible:border-vespera-border-strong disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={canSubmit}
          className="rounded-vespera-sm bg-vespera-accent px-3.5 py-2.5 text-sm font-semibold text-[#1a1712] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vespera-accent disabled:opacity-50"
        >
          Отправить
        </button>
      </div>
    </form>
  );
}