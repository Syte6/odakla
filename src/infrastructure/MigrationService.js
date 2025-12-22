import { Database } from './Database.js';

/**
 * MigrationService - localStorage verilerini SQLite'a taşımaktan sorumludur.
 */
export class MigrationService {
    static async migrate() {
        const isMigrated = localStorage.getItem('odakla_migrated_to_sqlite');
        if (isMigrated) return;

        console.log('Migration starting: localStorage -> SQLite');

        try {
            // 1. Alışkanlıklar
            const habits = JSON.parse(localStorage.getItem('odakla_habits') || '[]');
            for (const h of habits) {
                await Database.run(
                    'INSERT OR IGNORE INTO habits (id, title, type, goal, unit, pomodoro_duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [h.id, h.title, h.type, h.goal, h.unit, h.pomodoro_duration, h.createdAt]
                );
            }

            // 2. İlerleme Kayıtları
            const progress = JSON.parse(localStorage.getItem('odakla_progress') || '[]');
            for (const p of progress) {
                await Database.run(
                    'INSERT OR IGNORE INTO progress_records (id, habitId, date, value, completed) VALUES (?, ?, ?, ?, ?)',
                    [p.id || Math.random().toString(36).substring(2), p.habitId, p.date, p.value, p.completed ? 1 : 0]
                );
            }

            // 3. Görevler
            const tasks = JSON.parse(localStorage.getItem('odakla_tasks') || '[]');
            for (const t of tasks) {
                await Database.run(
                    'INSERT OR IGNORE INTO tasks (id, title, priority, deadline, location, notes, completed, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [t.id, t.title, t.priority, t.deadline, t.location, t.notes, t.completed ? 1 : 0, t.completedAt, t.createdAt]
                );
            }

            // 4. Aylık Hedefler
            const goals = JSON.parse(localStorage.getItem('odakla_monthly_goals') || '[]');
            for (const g of goals) {
                await Database.run(
                    'INSERT OR IGNORE INTO monthly_goals (id, title, status, created_at) VALUES (?, ?, ?, ?)',
                    [g.id, g.title, g.status, g.createdAt]
                );
            }

            localStorage.setItem('odakla_migrated_to_sqlite', 'true');
            console.log('Migration completed successfully.');
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }
}
