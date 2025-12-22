import { eventBus } from '../infrastructure/EventBus.js';
import { Habit } from '../domain/Habit.js';
import { Database } from '../infrastructure/Database.js';

/**
 * HabitService - Alışkanlıkların iş mantığını ve SQLite depolamasını yönetir.
 */
export class HabitService {
    /**
     * Tüm alışkanlıkları getirir.
     */
    static async getAllHabits() {
        const rows = await Database.query('SELECT * FROM habits ORDER BY created_at DESC');
        return rows.map(h => new Habit(h));
    }

    /**
     * Yeni bir alışkanlık ekler.
     */
    static async addHabit(habitData) {
        const newHabit = new Habit(habitData);
        const json = newHabit.toJSON();

        await Database.run(
            `INSERT INTO habits (id, title, type, goal, unit, pomodoro_duration) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [json.id, json.title, json.type, json.goal, json.unit, json.pomodoro_duration]
        );

        eventBus.emit('HABIT_ADDED', newHabit);
        return newHabit;
    }

    /**
     * Bugünün ilerleme kayıtlarını getirir.
     */
    static async getTodayProgress() {
        const today = new Date().toISOString().split('T')[0];
        const rows = await Database.query('SELECT * FROM progress_records WHERE date = ?', [today]);
        return rows.map(r => ({
            ...r,
            completed: Boolean(r.completed)
        }));
    }

    /**
     * Bir alışkanlığın ilerlemesini günceller.
     */
    static async updateProgress(habitId, value) {
        const today = new Date().toISOString().split('T')[0];

        // Önce alışkanlığı bulalım (hedef kontrolü için)
        const rows = await Database.query('SELECT goal FROM habits WHERE id = ?', [habitId]);
        if (rows.length === 0) return;
        const goal = rows[0].goal;
        const completed = value >= goal ? 1 : 0;

        // Mevcut kaydı kontrol et
        const existing = await Database.query(
            'SELECT id FROM progress_records WHERE habitId = ? AND date = ?',
            [habitId, today]
        );

        let recordId;
        if (existing.length > 0) {
            recordId = existing[0].id;
            await Database.run(
                'UPDATE progress_records SET value = ?, completed = ? WHERE id = ?',
                [value, completed, recordId]
            );
        } else {
            recordId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
            await Database.run(
                'INSERT INTO progress_records (id, habitId, date, value, completed) VALUES (?, ?, ?, ?, ?)',
                [recordId, habitId, today, value, completed]
            );
        }

        const record = { habitId, date: today, value, completed: Boolean(completed) };
        eventBus.emit('PROGRESS_UPDATED', record);
        return record;
    }

    /**
     * Alışkanlığı siler.
     */
    static async deleteHabit(id) {
        await Database.run('DELETE FROM habits WHERE id = ?', [id]);
        eventBus.emit('HABIT_DELETED', id);
    }
}
