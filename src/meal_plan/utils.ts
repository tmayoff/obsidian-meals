import moment from 'moment';

export function GetCurrentWeek() {
    const currentDate = new Date();
    const lastSundayDate = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));

    return moment(lastSundayDate).format('MMMM Do');
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
