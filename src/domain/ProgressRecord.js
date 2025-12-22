/**
 * İlerleme Kaydı (ProgressRecord) Entity
 * Alışkanlıkların günlük bazda ne kadar ilerlediğini tutar.
 */
export class ProgressRecord {
    constructor({
        habitId,
        date = new Date().toISOString().split('T')[0], // YYYY-MM-DD
        value = 0,
        completed = false
    }) {
        if (!habitId) throw new Error('HabitId zorunludur.');

        this.habitId = habitId;
        this.date = date;
        this.value = value;
        this.completed = completed;
    }

    updateProgress(newValue, targetGoal) {
        this.value = newValue;
        this.completed = this.value >= targetGoal;
    }

    toJSON() {
        return {
            habitId: this.habitId,
            date: this.date,
            value: this.value,
            completed: this.completed
        };
    }
}
