/**
 * Alışkanlık (Habit) Entity
 * Bu sınıf saf iş mantığını ve veri yapısını temsil eder.
 */
export class Habit {
    constructor({
        id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        title,
        type = 'yes-no', // 'yes-no', 'numeric', 'duration'
        goal,
        unit = '',
        pomodoroDuration = 25,
        tags = [],
        location = '',
        notes = '',
        createdAt = Date.now()
    }) {
        if (!title) throw new Error('Alışkanlık başlığı zorunludur.');

        this.id = id;
        this.title = title;
        this.type = type;
        this.goal = goal;
        this.unit = unit;
        this.pomodoroDuration = pomodoroDuration;
        this.tags = tags;
        this.location = location;
        this.notes = notes;
        this.createdAt = createdAt;
    }

    // Veriyi düz bir objeye dönüştürür (LocalStorage için)
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            goal: this.goal,
            unit: this.unit,
            pomodoroDuration: this.pomodoroDuration,
            tags: this.tags,
            location: this.location,
            notes: this.notes,
            createdAt: this.createdAt
        };
    }
}
