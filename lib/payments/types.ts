export type AuthorizationStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "requires_capture"
  | "succeeded"
  | "canceled";

export type ConnectAccountStatus = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export type AuthorizationSnapshot = {
  paymentIntentId: string;
  clientSecret: string | null;
  status: AuthorizationStatus;
  amountCents: number;
  applicationFeeCents: number;
  amountReceivedCents: number;
};

export type PaymentProvider = {
  createConnectAccount(input: {
    merchantId: string;
    displayName: string;
    contactEmail: string;
  }): Promise<{ accountId: string }>;
  createOnboardingLink(input: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  retrieveConnectAccount(accountId: string): Promise<ConnectAccountStatus>;
  createManualAuthorization(input: {
    amountCents: number;
    applicationFeeCents: number;
    destinationAccountId: string;
    reservationId: string;
    idempotencyKey: string;
  }): Promise<{ paymentIntentId: string; clientSecret: string; status: AuthorizationStatus }>;
  retrieveAuthorization(paymentIntentId: string): Promise<AuthorizationSnapshot>;
  captureAuthorization(input: {
    paymentIntentId: string;
    idempotencyKey: string;
    amountToCaptureCents?: number;
    applicationFeeCents?: number;
  }): Promise<{
    status: AuthorizationStatus;
    amountReceivedCents: number;
    applicationFeeCents: number;
  }>;
  cancelAuthorization(input: {
    paymentIntentId: string;
    idempotencyKey: string;
  }): Promise<void>;
};

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}
