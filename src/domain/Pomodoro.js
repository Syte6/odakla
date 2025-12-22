/**
 * Pomodoro (Odak Seansı) Entity
 */
export class Pomodoro {
    constructor({
        id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        habitId = null,
        name = 'Odak Seansı',
        startTime = Date.now(),
        duration = 25,
        type = 'work',
        status = 'running',
        remainingSeconds = null,
        totalSessions = 1,
        currentSessionIndex = 1,
        breakDuration = 5
    }) {
        this.id = id;
        this.habitId = habitId;
        this.name = name;
        this.startTime = startTime;
        this.duration = duration;
        this.type = type;
        this.status = status;
        this.remainingSeconds = remainingSeconds !== null ? remainingSeconds : duration * 60;
        this.totalSessions = totalSessions;
        this.currentSessionIndex = currentSessionIndex;
        this.breakDuration = breakDuration;
    }

    toJSON() {
        return {
            id: this.id,
            habitId: this.habitId,
            name: this.name,
            startTime: this.startTime,
            duration: this.duration,
            type: this.type,
            status: this.status,
            remainingSeconds: this.remainingSeconds,
            totalSessions: this.totalSessions,
            currentSessionIndex: this.currentSessionIndex,
            breakDuration: this.breakDuration
        };
    }
}
