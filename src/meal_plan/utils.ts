import moment from 'moment';

export function get_current_week() {
    const current_date = new Date();
    const last_sunday_date = new Date(current_date.setDate(current_date.getDate() - current_date.getDay()));

    return moment(last_sunday_date).format('MMMM Do');
}


// https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format#4673436
export function formatUniforn(fmt_string: string, obj: object) {
    let str = fmt_string;

    for (const [key, raw_value] of Object.entries(obj)) {
        let value = raw_value;
        if (raw_value == null) {
            value = "";
        }
        str = str.replace(new RegExp(`\\{${key}\\}`, "gi"), value); 
    }

    return str;
};
