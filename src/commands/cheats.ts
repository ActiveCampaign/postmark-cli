import chalk from 'chalk'
import { prompt } from 'inquirer'

export const desc = false;
export const builder = () => { ask() };

const ask = (): Promise<void> => {
  return cheatInput(enteredCode.length > 0).then(code => {
    checkAnswer(code)
  })
};

let enteredCode: string[] = [];
let lastEnteredCode: string = '⬆️';

const compareAnswers = (first: string[], second: string[]): boolean => {
  if (first.length !== second.length) {
    return false;
  }

  for(let i=0; i< first.length; i++) {
    if (first[i] !== second[i]) { return false; }
  }

  return true;
};

const checkAnswer = (code: string): void => {
  lastEnteredCode = code;
  enteredCode.push(code);

  if (code === 'START') {
    if (compareAnswers(enteredCode,superSecretAnswer)) {
      const title = chalk.yellow('⭐ PROMO CODE UNLOCKED! ⭐');
      const promoCode = chalk.bgCyan.black(superNotSoSecretPromoCode)
      let promoCodeMessage = `\n\nUse this promo code to receive $5 off at Postmark: 👉 ${promoCode} 👈`;
      promoCodeMessage += "\n\nhttps://account.postmarkapp.com/subscription\n";
      promoCodeMessage += "https://account.postmarkapp.com/billing_settings";
      console.log(`️${title}️${promoCodeMessage}`);
    } else {
      console.log('Sorry, try again!')
    }
  } else {
    ask()
  }
};

const cheatInput = (hideMessage: boolean): Promise<string> =>
  new Promise<string>(resolve => {
    const title = '🔥🔥 ENTER THY CHEAT CODE 🔥🔥\n';

    prompt([
      {
        type: 'list',
        name: 'code',
        default: lastEnteredCode,
        choices: choices,
        message: hideMessage ? '\n' : title,
      },
    ]).then((answer: any) => {
      return resolve(answer.code)
    })
  });

const choices: string[] = ['⬆️', '➡️', '⬇️', '⬅️', 'A', 'B', 'START'];
const superSecretAnswer: string[] = ['⬆️', '⬆️', '⬇️', '⬇️', '⬅️', '➡️', '⬅️', '➡️', 'B', 'A', 'START'];
const superSecretPromoCode = 'U1VQRVJDTEk1';
const superNotSoSecretPromoCode: string = Buffer.from(superSecretPromoCode, 'base64').toString();
