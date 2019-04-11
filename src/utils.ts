import { homedir } from 'os'

/**
 * Converts tildy paths to absolute paths.
 * Take from https://github.com/sindresorhus/untildify
 * @param  input
 * @returns string containing resolved home directory
 */
export const untildify = (input: string) =>
  homedir() ? input.replace(/^~(?=$|\/|\\)/, homedir()) : input

/**
 * Convert a string to compatible template alias
 * @param  name - The string to format
 * @returns the formatted string
 */
export const convertToAlias = (name: string) =>
  name.replace(/[^a-z0-9_\-.]+/i, '_').toLowerCase()

/**
 * Pluralize a string
 * @param  count
 * @param  singular
 * @param  plural
 * @returns The proper string depending on the count
 */
export const pluralize = (count: number, singular: string, plural: string) =>
  count > 1 ? plural : singular
