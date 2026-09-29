export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_MEMBER_LIMIT = 256;
export const GROUP_NAME_MAX_LENGTH = 60;

export type GroupFormErrors = Partial<Record<'name' | 'memberLimit' | 'members', string>>;

export type GroupFormValues = {
  name: string;
  memberLimitText: string;
  memberIds: readonly string[];
};

export type GroupFormValidation = {
  errors: GroupFormErrors;
  memberLimit: number | null;
  isValid: boolean;
};

export class GroupFullError extends Error {
  constructor(public readonly memberLimit: number) {
    super(`O grupo atingiu o limite de ${memberLimit} integrantes.`);
    this.name = 'GroupFullError';
  }
}

/** Aceita apenas inteiros positivos escritos com dígitos (sem sinais, decimais ou espaços). */
export function parseMemberLimit(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

export function availableSlots(memberCount: number, memberLimit: number): number {
  return Math.max(0, memberLimit - memberCount);
}

export function validateMemberLimit(memberLimit: number | null, memberCount: number): string | null {
  if (memberLimit === null) return 'Informe um número inteiro válido.';
  if (memberLimit < MIN_GROUP_MEMBERS) return `O limite mínimo é ${MIN_GROUP_MEMBERS} integrantes.`;
  if (memberLimit > MAX_GROUP_MEMBER_LIMIT) return `O limite máximo é ${MAX_GROUP_MEMBER_LIMIT} integrantes.`;
  if (memberLimit < memberCount) {
    return `O limite não pode ser menor que a quantidade atual de integrantes (${memberCount}).`;
  }
  return null;
}

export function validateGroupForm(values: GroupFormValues): GroupFormValidation {
  const errors: GroupFormErrors = {};
  const name = values.name.trim();
  const uniqueMembers = new Set(values.memberIds);
  const memberLimit = parseMemberLimit(values.memberLimitText);

  if (!name) errors.name = 'Informe o nome do grupo.';
  else if (name.length > GROUP_NAME_MAX_LENGTH) errors.name = `Use no máximo ${GROUP_NAME_MAX_LENGTH} caracteres.`;

  if (uniqueMembers.size < MIN_GROUP_MEMBERS) {
    errors.members = 'Selecione pelo menos mais um integrante.';
  }

  const limitError = validateMemberLimit(memberLimit, uniqueMembers.size);
  if (limitError) errors.memberLimit = limitError;

  return { errors, memberLimit, isValid: Object.keys(errors).length === 0 };
}

/** Aplica adições/remoções sobre a lista atual preservando a ordem e sem duplicatas. */
export function applyMemberChanges(
  current: readonly string[],
  add: readonly string[],
  remove: readonly string[],
): string[] {
  const removeSet = new Set(remove);
  const kept = current.filter((id) => !removeSet.has(id));
  const keptSet = new Set(kept);
  const added = add.filter((id, index) => !keptSet.has(id) && !removeSet.has(id) && add.indexOf(id) === index);
  return [...kept, ...added];
}
