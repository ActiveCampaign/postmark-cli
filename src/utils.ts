import { homedir } from 'os'

/**
 * Converts tildy paths to absolute paths.
 * Take from https://github.com/sindresorhus/untildify
 * @returns string containing resolved home directory
 */
export const untildify = (input: string) =>
  homedir() ? input.replace(/^~(?=$|\/|\\)/, homedir()) : input

/**
 * Convert a string to compatible template alias
 * @returns the formatted string
 */
export const convertToAlias = (name: string) =>
  name.replace(/[^a-z0-9_\-.]+/i, '_').toLowerCase()

/**
 * Pluralize a string
 * @returns The proper string depending on the count
 */
export const pluralize = (count: number, singular: string, plural: string) =>
  count > 1 ? plural : singular
