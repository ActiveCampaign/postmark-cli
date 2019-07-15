/**
 * Pluralize a string
 * @returns The proper string depending on the count
 */
export const pluralize = (count: number, singular: string, plural?: string): string =>
{
  if (plural === undefined) {
    return <string>(count > 1 || count === 0 ? singular + 's' : singular);
  }
  else {
    return (count > 1 || count === 0 ? plural : singular);
  }
}
