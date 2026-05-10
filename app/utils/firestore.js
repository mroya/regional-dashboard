/**
 * Sanitiza dados para Firestore, convertendo arrays aninhados em strings.
 * Firestore não suporta arrays aninhados diretamente.
 */
export function sanitizeFirestoreData(data) {
  if (Array.isArray(data)) {
    return data.map(sanitizeFirestoreData).join(', ');
  } else if (data !== null && typeof data === 'object') {
    const sanitized = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = sanitizeFirestoreData(data[key]);
      }
    }
    return sanitized;
  } else {
    return data;
  }
}