import { type TokensList } from 'marked';
import moment from 'moment';

export function get_current_week() {
    const current_date = new Date();
    const last_sunday_date = new Date(current_date.setDate(current_date.getDate() - current_date.getDay()));

    return moment(last_sunday_date).format('MMMM Do');
}

export function get_index_of_heading(lexed: TokensList, depth = 1, start = 0) {
    for (let i = start; i < lexed.length; i++) {
        const tok = lexed[i];
        if (tok.type === 'heading' && tok.depth === depth) {
            return i;
        }
    }

    return -1;
}
