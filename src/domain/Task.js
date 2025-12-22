/**
 * Görev (Task) Entity
 * Tek seferlik yapılacak işleri temsil eder.
 */
export class Task {
    constructor({
        id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        title,
        deadline = null,
        completed = false,
        priority = 'medium', // 'low', 'medium', 'high'
        tags = [],
        location = '',
        notes = '',
        reminderAt = null,
        completedAt = null,
        createdAt = Date.now()
    }) {
        if (!title) throw new Error('Görev başlığı zorunludur.');

        this.id = id;
        this.title = title;
        this.deadline = deadline;
        this.completed = completed;
        this.priority = priority;
        this.tags = tags;
        this.location = location;
        this.notes = notes;
        this.reminderAt = reminderAt;
        this.completedAt = completedAt;
        this.createdAt = createdAt;
    }

    toggleComplete() {
        this.completed = !this.completed;
        this.completedAt = this.completed ? Date.now() : null;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            deadline: this.deadline,
            completed: this.completed,
            priority: this.priority,
            tags: this.tags,
            location: this.location,
            notes: this.notes,
            reminderAt: this.reminderAt,
            completedAt: this.completedAt,
            createdAt: this.createdAt
        };
    }
}
