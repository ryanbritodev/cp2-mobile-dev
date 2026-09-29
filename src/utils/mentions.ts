type Mentionable = { uid: string; name: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Identifica integrantes mencionados com `@Nome` no texto. A menção precisa terminar
 * em espaço, pontuação ou fim do texto, para que `@Ana` não marque `@Ana Paula`.
 */
export function extractMentionedUserIds(
  text: string,
  members: readonly Mentionable[],
  senderId: string,
): string[] {
  return members
    .filter((member) => member.uid !== senderId && member.name.trim().length > 0)
    .filter((member) => {
      const pattern = new RegExp(`(^|\\s)@${escapeRegExp(member.name.trim())}(?=$|[\\s.,!?;:])`, 'i');
      return pattern.test(text);
    })
    .map((member) => member.uid);
}

export function appendMention(text: string, name: string): string {
  const separator = text.length === 0 || text.endsWith(' ') ? '' : ' ';
  return `${text}${separator}@${name.trim()} `;
}
