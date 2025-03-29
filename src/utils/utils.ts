import moment from 'moment';

export function GetCurrentWeek(startOfWeek: number) {
    return moment().weekday(startOfWeek).format('MMMM Do');
}

// https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format#4673436
export function formatUnicorn(fmtString: string, obj: object) {
    let str = fmtString;

    for (const [key, rawValue] of Object.entries(obj)) {
        let value = rawValue;
        if (rawValue == null) {
            value = '';
        }
        str = str.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
    }

    return str;
}

export function wildcardToRegex(pattern: string): RegExp {
    const escaped = pattern
        .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // Escape regex special chars
        .replace(/\*/g, '.*'); // Convert wildcard '*' to '.*'
    return new RegExp(`^${escaped}$`);
}
