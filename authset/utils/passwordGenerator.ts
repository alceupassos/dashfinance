export interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

export const generatePassword = (options: PasswordOptions): string => {
  let charset = '';
  let requiredChars = [];
  
  if (options.includeUppercase) {
    charset += CHARSETS.uppercase;
    requiredChars.push(CHARSETS.uppercase[Math.floor(Math.random() * CHARSETS.uppercase.length)]);
  }
  if (options.includeLowercase) {
    charset += CHARSETS.lowercase;
    requiredChars.push(CHARSETS.lowercase[Math.floor(Math.random() * CHARSETS.lowercase.length)]);
  }
  if (options.includeNumbers) {
    charset += CHARSETS.numbers;
    requiredChars.push(CHARSETS.numbers[Math.floor(Math.random() * CHARSETS.numbers.length)]);
  }
  if (options.includeSymbols) {
    charset += CHARSETS.symbols;
    requiredChars.push(CHARSETS.symbols[Math.floor(Math.random() * CHARSETS.symbols.length)]);
  }

  if (charset.length === 0) {
    return '';
  }

  let password = requiredChars.join('');

  for (let i = password.length; i < options.length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}
