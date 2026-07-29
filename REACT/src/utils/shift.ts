export interface ShiftOption {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    grace_period_minutes?: number;
    work_days?: string[];
}

const shortDay = (day: string) => day.slice(0, 3);

const formatTime = (value: string) => {
    const [hourPart, minute = '00'] = value.split(':');
    const hour = Number(hourPart);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
};

const formatWorkDays = (days?: string[]) => {
    const workDays = days?.length
        ? days
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (
        workDays.length === 6
        && workDays[0] === 'Monday'
        && workDays[5] === 'Saturday'
    ) {
        return 'Mon–Sat';
    }

    return workDays.map(shortDay).join(', ');
};

export const formatShiftOption = (shift: ShiftOption) => (
    `${shift.name} · ${formatTime(shift.start_time)}–${formatTime(shift.end_time)} · ${formatWorkDays(shift.work_days)}`
);
