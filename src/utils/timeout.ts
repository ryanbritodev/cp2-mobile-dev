/**
 * Limita a espera por uma promise. Escritas no Firestore só resolvem quando o
 * servidor confirma: sem rede, ou com a cota esgotada, elas ficam *pendentes*
 * (não rejeitam), e um `catch` não é suficiente para destravar o fluxo.
 */
export function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), milliseconds);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}
