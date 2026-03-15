/**
 * Pure input validation — no React dependencies.
 * Each function returns { valid: boolean, error: string | null }.
 */

export function validateAmount(value) {
  const n = Number(value);
  if (!value || String(value).trim() === "") {
    return { valid: false, error: "Amount is required." };
  }
  if (isNaN(n) || !Number.isInteger(n)) {
    return { valid: false, error: "Amount must be a whole number." };
  }
  if (n <= 0) {
    return { valid: false, error: "Amount must be greater than 0." };
  }
  if (n > 2000) {
    return { valid: false, error: "Amount seems too high (max 2000 ml)." };
  }
  return { valid: true, error: null };
}

export function validateDuration(value) {
  const n = Number(value);
  if (!value || String(value).trim() === "") {
    return { valid: false, error: "Duration is required." };
  }
  if (isNaN(n) || !Number.isInteger(n)) {
    return { valid: false, error: "Duration must be a whole number." };
  }
  if (n <= 0) {
    return { valid: false, error: "Duration must be greater than 0." };
  }
  if (n > 1440) {
    return { valid: false, error: "Duration cannot exceed 1440 min (24 h)." };
  }
  return { valid: true, error: null };
}

export function validateFeedingDuration(value) {
  const n = Number(value);
  if (!value || String(value).trim() === "") {
    return { valid: false, error: "Duration is required." };
  }
  if (isNaN(n) || !Number.isInteger(n)) {
    return { valid: false, error: "Duration must be a whole number." };
  }
  if (n <= 0) {
    return { valid: false, error: "Duration must be greater than 0." };
  }
  if (n > 120) {
    return { valid: false, error: "Duration seems too long (max 120 min)." };
  }
  return { valid: true, error: null };
}

export function validateWeight(value) {
  const n = Number(value);
  if (!value || String(value).trim() === "") {
    return { valid: false, error: "Weight is required." };
  }
  if (isNaN(n)) {
    return { valid: false, error: "Weight must be a number." };
  }
  if (n < 0.5) {
    return { valid: false, error: "Weight must be at least 0.5 kg." };
  }
  if (n > 30) {
    return { valid: false, error: "Weight seems too high (max 30 kg)." };
  }
  return { valid: true, error: null };
}

export function validateMilestoneTitle(value) {
  if (!value || String(value).trim() === "") {
    return { valid: false, error: "Title is required." };
  }
  if (value.trim().length > 100) {
    return { valid: false, error: "Title must be 100 characters or fewer." };
  }
  return { valid: true, error: null };
}
