import { eventBus } from './EventBus.js';
import { MonthlyGoal } from '../domain/MonthlyGoal.js';
import { Database } from '../infrastructure/Database.js';

/**
 * GoalService - Aylık hedeflerin iş mantığını ve SQLite depolamasını yönetir.
 */
export class GoalService {
    static async getAllGoals() {
        const rows = await Database.query('SELECT * FROM monthly_goals ORDER BY created_at DESC');
        return rows.map(g => new MonthlyGoal(g));
    }

    static async addGoal(title) {
        const newGoal = new MonthlyGoal({ title });
        const json = newGoal.toJSON();

        await Database.run(
            'INSERT INTO monthly_goals (id, title, status) VALUES (?, ?, ?)',
            [json.id, json.title, json.status]
        );

        eventBus.emit('GOAL_ADDED', newGoal);
        return newGoal;
    }

    static async toggleGoalStatus(id) {
        const rows = await Database.query('SELECT * FROM monthly_goals WHERE id = ?', [id]);
        if (rows.length === 0) return;

        const goalData = rows[0];
        const newStatus = goalData.status === 'completed' ? 'in-progress' : 'completed';

        await Database.run(
            'UPDATE monthly_goals SET status = ? WHERE id = ?',
            [newStatus, id]
        );

        const updatedGoal = new MonthlyGoal({ ...goalData, status: newStatus });
        eventBus.emit('GOAL_UPDATED', updatedGoal);
        return updatedGoal;
    }

    static async deleteGoal(id) {
        await Database.run('DELETE FROM monthly_goals WHERE id = ?', [id]);
        eventBus.emit('GOAL_DELETED', id);
    }
}
