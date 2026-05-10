export function sanitizeFirestoreData(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (Array.isArray(item)) {
        return JSON.stringify(item);
      }
      return sanitizeFirestoreData(item);
    });
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitizeFirestoreData(nested)])
    );
  }

  return value;
}
