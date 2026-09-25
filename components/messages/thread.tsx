"use client";

import { useActionState } from "react";

import {
  postMessageAction,
  type MessageActionState,
} from "@/app/messages/actions";
import { Button } from "@/components/ui/button";

export type ThreadMessage = {
  id: string;
  body: string;
  senderRole: "BUYER" | "MERCHANT";
  author: string;
  when: string;
  unread: boolean;
};

export function MessageThread({
  reservationId,
  messages,
  canWrite,
}: {
  reservationId: string;
  messages: ThreadMessage[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState<MessageActionState, FormData>(
    postMessageAction,
    {},
  );

  return (
    <section className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-4 rounded-2xl p-5">
      <div>
        <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
          Messagerie
        </p>
        <h2 className="font-headline-sm text-primary-container mt-1">
          Fil de la réservation
        </h2>
      </div>
      {messages.length === 0 ? (
        <p className="font-body-sm text-on-surface-variant">
          Aucun message. Écrivez au magasin ou à l’acheteur depuis ce fil.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-2xl px-3 py-2 ${
                message.senderRole === "BUYER"
                  ? "bg-surface-container"
                  : "bg-secondary-fixed text-on-secondary-fixed"
              }`}
            >
              <p className="font-label-xs text-label-xs font-bold">
                {message.author}
                {message.unread ? " · non lu" : ""}
              </p>
              <p className="font-body-sm mt-1 whitespace-pre-wrap">{message.body}</p>
              <p className="font-label-xs text-label-xs mt-1 opacity-80">{message.when}</p>
            </li>
          ))}
        </ol>
      )}
      {canWrite ? (
        <form action={action} className="flex flex-col gap-2">
          <input type="hidden" name="reservationId" value={reservationId} />
          <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
            Message
            <textarea
              name="body"
              required
              maxLength={2000}
              rows={3}
              className="border-outline-variant bg-surface font-body-sm rounded-2xl border px-3 py-2"
            />
          </label>
          {state.error ? (
            <p className="font-body-sm text-error">{state.error}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Envoi…" : "Envoyer"}
          </Button>
        </form>
      ) : (
        <p className="font-body-sm text-on-surface-variant">
          Lecture seule. Seuls l’acheteur et le vendeur de l’enseigne écrivent
          dans ce fil.
        </p>
      )}
    </section>
  );
}
