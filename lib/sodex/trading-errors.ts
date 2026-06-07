export function isCancelOnlyError(message: string) {
  return message.toLowerCase().includes("cancel only");
}

export function isSignatureRecoveryError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("recovery id") ||
    normalized.includes("recover signer") ||
    normalized.includes("invalid signature")
  );
}

export type LegErrorCategory = "success" | "cancel-only" | "signature" | "halted" | "other";

export function classifyLegResult(result: BasketLegSubmitResult): LegErrorCategory {
  if (result.ok) {
    return "success";
  }

  if (isCancelOnlyError(result.message)) {
    return "cancel-only";
  }

  if (isSignatureRecoveryError(result.message)) {
    return "signature";
  }

  if (/halt|not accepted right now/i.test(result.message)) {
    return "halted";
  }

  return "other";
}

export function legStatusLabel(category: LegErrorCategory) {
  switch (category) {
    case "success":
      return "Submitted";
    case "cancel-only":
      return "Cancel-only";
    case "signature":
      return "Signature error";
    case "halted":
      return "Market paused";
    default:
      return "Failed";
  }
}

export function legStatusHint(category: LegErrorCategory) {
  switch (category) {
    case "success":
      return "Limit buy accepted by SoDEX.";
    case "cancel-only":
      return "SoDEX testnet maintenance — new orders paused on this market. Retry later.";
    case "signature":
      return "Wallet signature could not be verified. Stay on ValueChain Testnet and approve the popup again.";
    case "halted":
      return "This market is not accepting new orders right now.";
    default:
      return "This leg could not be placed. Check the message and retry.";
  }
}

export function isSymbolHalted(status: string) {
  return status.trim().toUpperCase() !== "TRADING";
}

export function formatSymbolTradingBlockReason(displayName: string, status: string) {
  const normalized = status.trim().toUpperCase();

  if (normalized === "HALT") {
    return `${displayName} is halted on SoDEX; new orders are not accepted right now.`;
  }

  return `${displayName} is ${status} on SoDEX; new orders are not accepted right now.`;
}

export function formatCancelOnlyReason(displayName: string) {
  return `${displayName} is in cancel-only mode on SoDEX (maintenance). Existing orders can be canceled, but new orders are paused. Try again later or submit the other basket legs individually.`;
}

export function formatTradingErrorMessage(error: string, displayName?: string) {
  if (isCancelOnlyError(error)) {
    return displayName ? formatCancelOnlyReason(displayName) : error;
  }

  return error;
}

export type BasketLegSubmitResult = {
  asset: string;
  clOrdID: string;
  displayName?: string;
  ok: boolean;
  message: string;
};

export function summarizeLegSubmitResults(results: BasketLegSubmitResult[]) {
  const submitted = results.filter((result) => result.ok);
  const blocked = results.filter((result) => !result.ok);

  if (submitted.length === 0 && blocked.length === 0) {
    return "No basket legs were submitted.";
  }

  if (submitted.length === 0) {
    const cancelOnly = blocked.filter((result) => isCancelOnlyError(result.message));
    if (cancelOnly.length === blocked.length) {
      return `SoDEX testnet is not accepting new orders for ${blocked.map((result) => result.asset).join(", ")} (cancel-only mode). Wait a few minutes and retry, or try a basket with different markets.`;
    }

    return blocked.map((result) => `${result.asset}: ${result.message}`).join("; ");
  }

  if (blocked.length === 0) {
    return `Submitted ${submitted.length} basket ${submitted.length === 1 ? "order" : "orders"} to SoDEX.`;
  }

  return `Submitted ${submitted.length}/${results.length} legs (${submitted.map((result) => result.asset).join(", ")}). Skipped: ${blocked.map((result) => `${result.asset} (${result.message})`).join("; ")}`;
}
