import { Argv } from 'yargs'
import { CommandOptions } from '../types/'

/**
 * Bootstrap commands
 * @returns yargs compatible command options
 */
export const cmd = (name: string, desc: string): CommandOptions => ({
  name: name,
  command: `${name} <command> [options]`,
  desc: desc,
  builder: (yargs: Argv) => yargs.commandDir(name),
});