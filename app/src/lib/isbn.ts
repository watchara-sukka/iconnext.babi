export function normalizeISBN(isbn: string): string {
    // Remove hyphens and spaces
    const clean = isbn.replace(/[\s-]/g, '');

    if (clean.length === 10) {
        return convertISBN10to13(clean);
    }

    return clean;
}

export function convertISBN10to13(isbn10: string): string {
    const prefix = '978';
    const core = prefix + isbn10.substring(0, 9);

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(core[i]) * (i % 2 === 0 ? 1 : 3);
    }

    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;

    return core + checkDigit;
}

export function formatISBN(isbn: string): string {
    const clean = normalizeISBN(isbn);
    if (clean.length === 13) {
        // 978-1-234-56789-0 (approximate formatting)
        return `${clean.substring(0, 3)}-${clean.substring(3, 4)}-${clean.substring(4, 8)}-${clean.substring(8, 12)}-${clean.substring(12)}`;
    }
    return isbn;
}
