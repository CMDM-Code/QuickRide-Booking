export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 3000,
  errorMessage: string = 'TIMEOUT'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeout]);
}

export function toSafeDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Handle Firestore Timestamp class
  if (typeof v.toDate === 'function') return v.toDate();
  // Handle Firestore Timestamp POJO {seconds, nanoseconds}
  if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  // Handle ISO strings or numeric timestamps
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
