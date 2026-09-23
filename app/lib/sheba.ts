/**
 * Iranian Sheba = IBAN with country code IR: "IR" + 24 digits, validated with
 * the standard ISO 13616 mod-97 checksum so a mistyped digit is caught before
 * an admin tries to wire money to it.
 */
export function normalizeSheba(input: string) {
  const digits = input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\s-]/g, "")
    .toUpperCase()
    .replace(/^IR/, "");
  return `IR${digits}`;
}

export function isValidSheba(sheba: string) {
  if (!/^IR\d{24}$/.test(sheba)) return false;
  // Move "IR" + check digits to the end, letters → numbers (I=18, R=27), then mod 97 must be 1.
  const rearranged = `${sheba.slice(4)}1827${sheba.slice(2, 4)}`;
  let remainder = 0;
  for (const ch of rearranged) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}
