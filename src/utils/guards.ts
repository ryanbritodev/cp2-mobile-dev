/** Type guards para validar dados vindos do Firebase/API sem recorrer a `any`. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(source: Record<string, unknown>, key: string, fallback = ''): string {
  const value = source[key];
  return typeof value === 'string' ? value : fallback;
}

export function readNumber(source: Record<string, unknown>, key: string, fallback = 0): number {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readBoolean(source: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = source[key];
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Lê uma lista de strings. O Realtime Database pode devolver arrays como objetos
 * (`{"0": "a", "1": "b"}`), então os dois formatos são aceitos.
 */
export function readStringArray(source: Record<string, unknown>, key: string): string[] {
  const value = source[key];
  const items: unknown[] = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  return items.filter((item): item is string => typeof item === 'string');
}
