export function cn(...classes: Array<string | number | false | null | undefined>) {
  return classes.filter((value) => typeof value === "string" || typeof value === "number").join(" ");
}

export function formatCurrency(amount: number, locale = "fr-BE", currency = "EUR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, locale = "fr-BE") {
  return new Intl.NumberFormat(locale).format(value);
}
