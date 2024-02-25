import moment from 'moment';

export function get_current_week() {
    const current_date = new Date();
    const last_sunday_date = new Date(current_date.setDate(current_date.getDate() - current_date.getDay()));

    return moment(last_sunday_date).format('MMMM Do');
}

