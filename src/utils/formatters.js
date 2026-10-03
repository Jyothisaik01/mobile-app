/**
 * Universal Currency & Number Formatter for Mobile App
 * Formats numbers into Indian Rupee (₹) format with comma separation (e.g. ₹55,555)
 */

export const formatPrice = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }
  const num = Math.round(Number(amount));
  return '₹' + num.toLocaleString('en-IN');
};

export const formatPriceDecimal = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0.00';
  }
  const num = Number(amount);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default {
  formatPrice,
  formatPriceDecimal,
};
