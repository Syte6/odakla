import { Task } from '../domain/Task.js';
import { Database } from '../infrastructure/Database.js';
import { eventBus } from './EventBus.js';

/**
 * TaskService - Görevlerin iş mantığını ve SQLite depolanmasını yönetir.
 */
export class TaskService {
    /**
     * Tüm görevleri getirir.
     */
    static async getAllTasks() {
        const rows = await Database.query('SELECT * FROM tasks ORDER BY created_at DESC');
        return rows.map(data => new Task({
            ...data,
            completed: Boolean(data.completed)
        }));
    }

    /**
     * Yeni bir görev ekler.
     */
    static async addTask(taskData) {
        if (!taskData.title) throw new Error('Görev başlığı boş olamaz.');

        const newTask = new Task(taskData);
        const json = newTask.toJSON();

        await Database.run(
            `INSERT INTO tasks (id, title, priority, deadline, location, notes, completed, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [json.id, json.title, json.priority, json.deadline, json.location, json.notes, json.completed ? 1 : 0, json.createdAt]
        );

        eventBus.emit('TASK_ADDED', newTask);
        return newTask;
    }

    /**
     * Görevin durumunu (yapıldı/yapılmadı) değiştirir.
     */
    static async toggleTaskStatus(taskId) {
        const rows = await Database.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (rows.length === 0) return;

        const taskData = rows[0];
        const task = new Task({
            ...taskData,
            completed: Boolean(taskData.completed)
        });

        task.toggleComplete();
        const json = task.toJSON();

        await Database.run(
            'UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?',
            [json.completed ? 1 : 0, json.completedAt, taskId]
        );

        eventBus.emit('TASK_UPDATED', task);
        return task;
    }

    /**
     * Bir görevi siler.
     */
    static async deleteTask(taskId) {
        await Database.run('DELETE FROM tasks WHERE id = ?', [taskId]);
        eventBus.emit('TASK_DELETED', taskId);
    }

    /**
     * Görevleri tarihe göre sıralı getirir (Yakın tarihli olanlar önce).
     */
    static async getSortedTasks() {
        const tasks = await this.getAllTasks();
        return tasks.sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        });
    }
}
