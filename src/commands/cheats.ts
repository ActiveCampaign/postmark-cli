import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { isEqual, last } from 'lodash'

const debug = require('debug')('postmark-cli:cheats')

export const desc = false
export const builder = () => {
  ask()
}

async function ask(): Promise<void> {
  const enteredCode: string[] = []

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const code = await cheatInput(enteredCode.length > 0)
    enteredCode.push(code)
    if (checkAnswer(enteredCode)) break
  }
}

function checkAnswer(answer: string[]): boolean {
  if (last(answer) !== 'START') return false

  if (isEqual(answer, superSecretAnswer)) {
    const title = chalk.yellow('PROMO CODE UNLOCKED!')
    const promoCode = chalk.bgCyan.black(superNotSoSecretPromoCode)

    console.log(
      `⭐️ ${title}⭐️\nUse this promo code to receive $5 off at Postmark:\n👉 ${promoCode} 👈\n\nhttps://account.postmarkapp.com/subscription\nhttps://account.postmarkapp.com/billing_settings`,
    )
  } else {
    console.log('Sorry, try again!')
  }
  return true
}

async function cheatInput(hideMessage: boolean): Promise<string> {
  const choices = ['⬆️', '➡️', '⬇️', '⬅️', 'A', 'B', 'START'].map(value => ({
    value,
  }))
  const answer = await select({
    choices,
    message: hideMessage ? '\n' : '🔥🔥 ENTER THY CHEAT CODE 🔥🔥\n',
  })
  debug('answer: %o', answer)
  return answer
}

const superSecretAnswer: string[] = [
  '⬆️',
  '⬆️',
  '⬇️',
  '⬇️',
  '⬅️',
  '➡️',
  '⬅️',
  '➡️',
  'B',
  'A',
  'START',
]
const superSecretPromoCode = 'U1VQRVJDTEk1'
const superNotSoSecretPromoCode: string = Buffer.from(
  superSecretPromoCode,
  'base64',
).toString()
