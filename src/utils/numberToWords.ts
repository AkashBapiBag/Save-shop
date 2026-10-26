const ONES: string[] = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS: string[] = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function twoDigitsToWords(n: number): string {
  if (n < 20) {
    return ONES[n];
  }
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }
  if (remainder > 0) {
    if (parts.length > 0) {
      parts.push('and');
    }
    parts.push(twoDigitsToWords(remainder));
  }
  return parts.join(' ');
}

export function numberToWordsINR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Zero Rupees only';
  if (num === 0) return 'Zero Rupees only';
  if (num < 0) return `Negative ${numberToWordsINR(Math.abs(num))}`;

  const rounded = Math.round(num * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const parts: string[] = [];

  if (rupees > 0) {
    let rem = rupees;

    const crores = Math.floor(rem / 10000000);
    rem = rem % 10000000;

    const lakhs = Math.floor(rem / 100000);
    rem = rem % 100000;

    const thousands = Math.floor(rem / 1000);
    rem = rem % 1000;

    const hundredsAndBelow = rem;

    if (crores > 0) {
      parts.push(`${threeDigitsToWords(crores)} Crore`);
    }
    if (lakhs > 0) {
      parts.push(`${twoDigitsToWords(lakhs)} Lakh`);
    }
    if (thousands > 0) {
      parts.push(`${twoDigitsToWords(thousands)} Thousand`);
    }
    if (hundredsAndBelow > 0) {
      parts.push(threeDigitsToWords(hundredsAndBelow));
    }
  }

  const rupeeStr = parts.length > 0 ? `${parts.join(' ')} ${rupees === 1 ? 'Rupee' : 'Rupees'}` : '';
  const paiseStr = paise > 0 ? `${twoDigitsToWords(paise)} Paisa` : '';

  if (rupeeStr && paiseStr) {
    return `${rupeeStr} and ${paiseStr} only`;
  } else if (rupeeStr) {
    return `${rupeeStr} only`;
  } else if (paiseStr) {
    return `${paiseStr} only`;
  } else {
    return 'Zero Rupees only';
  }
}
