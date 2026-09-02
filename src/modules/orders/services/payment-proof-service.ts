import type { PaymentProofStatus } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";
import {
  downloadPaymentProofObject,
  isTrustedPaymentProofPath,
  paymentProofFilename,
  uploadPaymentProofObject,
} from "@/shared/storage/payment-proof-storage";

import { customerCanUploadPaymentProof } from "../payment-proof";
import {
  findOrderByConfirmationToken,
  findOrderById,
  findOwnedOrderByOrderNumber,
} from "../repositories/order-repository";

async function loadAuthorizedOrder(input: {
  tenantId: string;
  orderNumber: string;
  confirmationToken?: string | null;
  customerId?: string | null;
}) {
  if (input.confirmationToken) {
    const byToken = await findOrderByConfirmationToken(
      input.tenantId,
      input.orderNumber,
      input.confirmationToken,
    );
    if (byToken) {
      return byToken;
    }
  }
  if (input.customerId) {
    const owned = await findOwnedOrderByOrderNumber(
      input.tenantId,
      input.customerId,
      input.orderNumber,
    );
    if (owned) {
      return owned;
    }
  }
  throw new AppError("NOT_FOUND", "Order not found");
}

export async function submitCustomerPaymentProof(input: {
  tenantId: string;
  orderNumber: string;
  confirmationToken?: string | null;
  customerId?: string | null;
  bytes: Uint8Array;
}): Promise<{ paymentProofStatus: PaymentProofStatus }> {
  const order = await loadAuthorizedOrder(input);

  if (
    !customerCanUploadPaymentProof({
      paymentMethod: order.paymentMethod,
      paymentProofStatus: order.paymentProofStatus,
    })
  ) {
    if (order.paymentMethod !== "aba_transfer") {
      throw new AppError("VALIDATION", "This order does not need a transfer screenshot");
    }
    throw new AppError("CONFLICT", "A transfer screenshot is already on file");
  }

  const uploaded = await uploadPaymentProofObject({
    tenantId: order.tenantId,
    orderId: order.id,
    bytes: input.bytes,
  });

  const updated = await prisma.order.updateMany({
    where: {
      id: order.id,
      tenantId: order.tenantId,
      paymentMethod: "aba_transfer",
      paymentProofStatus: { in: ["awaiting_proof", "rejected"] },
    },
    data: {
      paymentProofPath: uploaded.path,
      paymentProofContentType: uploaded.contentType,
      paymentProofSubmittedAt: new Date(),
      paymentProofReviewedAt: null,
      paymentProofRejectionReason: null,
      paymentProofStatus: "submitted",
    },
  });

  if (updated.count !== 1) {
    throw new AppError("CONFLICT", "A transfer screenshot is already on file");
  }

  return { paymentProofStatus: "submitted" };
}

export async function getAdminPaymentProofFile(input: {
  tenantId: string;
  orderId: string;
}): Promise<{ bytes: Uint8Array; contentType: string; filename: string }> {
  const order = await findOrderById(input.tenantId, input.orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found");
  }
  if (order.paymentMethod !== "aba_transfer") {
    throw new AppError("NOT_FOUND", "Payment proof not found");
  }
  if (!order.paymentProofPath) {
    throw new AppError("NOT_FOUND", "Payment proof not found");
  }
  if (!isTrustedPaymentProofPath(order.tenantId, order.id, order.paymentProofPath)) {
    throw new AppError("FORBIDDEN", "Invalid payment proof path");
  }

  const downloaded = await downloadPaymentProofObject(order.paymentProofPath);
  return {
    bytes: downloaded.bytes,
    contentType: order.paymentProofContentType ?? downloaded.contentType ?? "image/jpeg",
    filename: paymentProofFilename(order.orderNumber, order.paymentProofPath),
  };
}

export async function verifyOrderPaymentProof(input: {
  tenantId: string;
  orderId: string;
}): Promise<void> {
  const updated = await prisma.order.updateMany({
    where: {
      id: input.orderId,
      tenantId: input.tenantId,
      paymentMethod: "aba_transfer",
      paymentProofStatus: "submitted",
    },
    data: {
      paymentProofStatus: "verified",
      paymentProofReviewedAt: new Date(),
      paymentProofRejectionReason: null,
    },
  });
  if (updated.count !== 1) {
    throw new AppError("VALIDATION", "Only a submitted transfer screenshot can be verified");
  }
}

export async function rejectOrderPaymentProof(input: {
  tenantId: string;
  orderId: string;
  reason?: string;
}): Promise<void> {
  const reason = input.reason?.trim() || null;
  if (reason && reason.length > 240) {
    throw new AppError("VALIDATION", "Rejection reason must be 240 characters or fewer");
  }
  const updated = await prisma.order.updateMany({
    where: {
      id: input.orderId,
      tenantId: input.tenantId,
      paymentMethod: "aba_transfer",
      paymentProofStatus: "submitted",
    },
    data: {
      paymentProofStatus: "rejected",
      paymentProofReviewedAt: new Date(),
      paymentProofRejectionReason: reason,
    },
  });
  if (updated.count !== 1) {
    throw new AppError("VALIDATION", "Only a submitted transfer screenshot can be rejected");
  }
}
