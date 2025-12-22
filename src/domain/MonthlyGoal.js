/**
 * MonthlyGoal Entity
 */
export class MonthlyGoal {
    constructor({
        id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        title,
        status = 'in-progress', // 'in-progress', 'completed', 'cancelled'
        createdAt = Date.now()
    }) {
        this.id = id;
        this.title = title;
        this.status = status;
        this.createdAt = createdAt;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            status: this.status,
            createdAt: this.createdAt
        };
    }
}
