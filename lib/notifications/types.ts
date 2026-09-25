/** Destinataire d’une notification. Les canaux lisent les champs qui les concernent. */
export type NotificationRecipient = {
  userId: string;
  email: string | null;
};

export type OutboundNotification = {
  recipient: NotificationRecipient;
  subject: string;
  text: string;
};

/**
 * Canal d’envoi. E-mail aujourd’hui. WhatsApp ou in-app : ajouter une
 * implémentation à la liste dans send.ts, sans changer les appelants.
 */
export interface NotificationChannel {
  readonly id: "email" | "whatsapp" | "in_app";
  send(message: OutboundNotification): Promise<void>;
}
