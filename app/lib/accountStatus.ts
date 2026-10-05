interface AccountStatusFields {
  banned: boolean;
  banReason: string | null;
  suspendedUntil: Date | null;
}

/** Why an account can't use the site right now, as a Persian message — or null when it's in good standing. */
export function accountBlockMessage(user: AccountStatusFields) {
  if (user.banned) {
    return `حساب شما مسدود شده است.${user.banReason ? ` دلیل: ${user.banReason}` : ""}`;
  }
  if (user.suspendedUntil && user.suspendedUntil.getTime() > Date.now()) {
    return `حساب شما تا ${user.suspendedUntil.toLocaleDateString("fa-IR")} تعلیق شده است.`;
  }
  return null;
}
