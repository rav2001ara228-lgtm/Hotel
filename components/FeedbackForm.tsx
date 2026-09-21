"use client";

import { FormEvent, useRef, useState } from "react";

type Status = "idle" | "pending" | "success" | "error";

export function FeedbackForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Honeypot ref (не управляемое состояние, чтобы не попасть в React DevTools)
  const honeypotRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;

    setStatus("pending");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          message,
          website: honeypotRef.current?.value ?? "",
        }),
      });

      const data = (await res.json()) as { success: boolean };

      if (!res.ok || !data.success) {
        setStatus("error");
        return;
      }

      setStatus("success");
      setName("");
      setContact("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="feedback-section" aria-labelledby="feedback-title">
      <div className="feedback-inner reveal">
        <p className="eyebrow">Обратная связь</p>
        <h2 id="feedback-title" className="display">
          Напишите нам
        </h2>
        <p className="section-lead">
          Остались вопросы? Оставьте сообщение — мы ответим в течение дня.
        </p>

        <form
          className="feedback-form"
          onSubmit={onSubmit}
          noValidate
        >
          {/* Honeypot — скрыт от людей, виден для ботов */}
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              opacity: 0,
              pointerEvents: "none",
            }}
          />

          <label className="feedback-field">
            <span className="feedback-label">Имя</span>
            <input
              id="feedback-name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="feedback-input"
            />
          </label>

          <label className="feedback-field">
            <span className="feedback-label">Телефон или e-mail</span>
            <input
              id="feedback-contact"
              type="text"
              name="contact"
              autoComplete="email tel"
              placeholder="+7 000 000-00-00 или mail@example.com"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="feedback-input"
            />
          </label>

          <label className="feedback-field feedback-field--full">
            <span className="feedback-label">
              Сообщение <span aria-hidden="true">*</span>
            </span>
            <textarea
              id="feedback-message"
              name="message"
              required
              rows={5}
              placeholder="Расскажите, чем можем помочь…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="feedback-input feedback-textarea"
            />
          </label>

          <div className="feedback-footer">
            <button
              type="submit"
              className="btn btn--primary feedback-submit"
              disabled={status === "pending"}
              aria-busy={status === "pending"}
            >
              {status === "pending" ? "Отправляем…" : "Отправить"}
            </button>

            {status === "success" && (
              <p className="feedback-status feedback-status--ok" role="status">
                ✓ Спасибо, мы получили ваше сообщение
              </p>
            )}
            {status === "error" && (
              <p className="feedback-status feedback-status--err" role="alert">
                Не удалось отправить, попробуйте позже
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
