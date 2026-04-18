export async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), ms);
  });
  return Promise.race([promise, timeout]);
}


