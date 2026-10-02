/** Destinataire d’une notification. Les canaux lisent les champs qui les concernent. */
export type NotificationRecipient = {
  userId: string;
  email: string | null;
};

/**
 * Gate prefs acheteur :
 * - ORDER_UPDATES : emails transactionnels acheteur (défaut ON)
 * - DEAL_ALERTS : marketing (opt-in)
 * - null / omis : opérationnel (marchand, admin) — pas de gate
 */
export type NotificationPreferenceKind = "ORDER_UPDATES" | "DEAL_ALERTS" | null;

export type OutboundNotification = {
  recipient: NotificationRecipient;
  subject: string;
  text: string;
  /** Qui gate l’envoi. Omis / null = toujours envoyer (marchand/admin). */
  preferenceKind?: NotificationPreferenceKind;
};

/**
 * Canal d’envoi. E-mail aujourd’hui. WhatsApp ou in-app : ajouter une
 * implémentation à la liste dans send.ts, sans changer les appelants.
 */
export interface NotificationChannel {
  readonly id: "email" | "whatsapp" | "in_app";
  send(message: OutboundNotification): Promise<void>;
}
