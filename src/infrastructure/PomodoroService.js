import { eventBus } from './EventBus.js';
import { Pomodoro } from '../domain/Pomodoro.js';
import { Database } from '../infrastructure/Database.js';

/**
 * PomodoroService - Çoklu oturum (Cycle) mantığını yönetir ve SQLite'a kaydeder.
 */
export class PomodoroService {
    static timer = null;
    static currentSession = null;
    static expectedEndTime = null;

    static startCycle({ habitId, name, workDuration, breakDuration, sessions }) {
        if (this.timer) this.stopTimer();

        this.currentSession = new Pomodoro({
            habitId,
            name,
            duration: workDuration,
            type: 'work',
            totalSessions: sessions,
            currentSessionIndex: 1,
            breakDuration: breakDuration,
            startTime: Date.now()
        });

        this.expectedEndTime = Date.now() + (this.currentSession.remainingSeconds * 1000);
        this.startTimer();
        eventBus.emit('POMODORO_STARTED', this.currentSession);
    }

    // Geriye dönük uyumluluk için eski metot
    static startSession(habitId, durationMinutes, type = 'work', name = 'Odak Seansı') {
        this.startCycle({
            habitId,
            name,
            workDuration: durationMinutes,
            breakDuration: 5,
            sessions: 1
        });
    }

    static startTimer() {
        if (this.timer) return;

        this.timer = setInterval(() => {
            if (this.currentSession && this.currentSession.status === 'running') {
                const now = Date.now();
                const remaining = Math.round((this.expectedEndTime - now) / 1000);

                if (remaining <= 0) {
                    this.currentSession.remainingSeconds = 0;
                    this.finishSession();
                } else {
                    this.currentSession.remainingSeconds = remaining;
                    eventBus.emit('POMODORO_TICK', this.currentSession);
                }
            }
        }, 1000);
    }

    static stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    static pauseSession() {
        if (this.currentSession && this.currentSession.status === 'running') {
            this.currentSession.status = 'paused';
            this.stopTimer();
            eventBus.emit('POMODORO_PAUSED', this.currentSession);
        }
    }

    static resumeSession() {
        if (this.currentSession && this.currentSession.status === 'paused') {
            this.currentSession.status = 'running';
            this.expectedEndTime = Date.now() + (this.currentSession.remainingSeconds * 1000);
            this.startTimer();
            eventBus.emit('POMODORO_RESUMED', this.currentSession);
        }
    }

    static cancelSession() {
        if (this.currentSession) {
            this.currentSession.status = 'cancelled';
            this.stopTimer();
            eventBus.emit('POMODORO_CANCELLED', this.currentSession);
            this.currentSession = null;
        }
    }

    static async finishSession() {
        if (!this.currentSession) return;

        this.currentSession.status = 'finished';
        this.stopTimer();
        await this.saveToHistory(this.currentSession);

        const finishedSession = this.currentSession;

        // Döngü Mantığı: Bir sonraki oturumu belirle
        if (finishedSession.type === 'work') {
            if (finishedSession.currentSessionIndex < finishedSession.totalSessions) {
                // Molayı başlat
                this.currentSession = new Pomodoro({
                    ...finishedSession.toJSON(),
                    id: undefined, // Yeni ID
                    type: 'break',
                    duration: finishedSession.breakDuration,
                    remainingSeconds: finishedSession.breakDuration * 60,
                    status: 'running',
                    startTime: Date.now()
                });
                this.expectedEndTime = Date.now() + (this.currentSession.remainingSeconds * 1000);
                setTimeout(() => {
                    this.startTimer();
                    eventBus.emit('POMODORO_STARTED', this.currentSession);
                }, 1000);
            } else {
                // Tümü bitti
                this.currentSession = null;
                eventBus.emit('POMODORO_FINISHED', finishedSession);
            }
        } else {
            // Mola bitti, bir sonraki iş oturumuna geç
            this.currentSession = new Pomodoro({
                ...finishedSession.toJSON(),
                id: undefined,
                type: 'work',
                currentSessionIndex: finishedSession.currentSessionIndex + 1,
                remainingSeconds: finishedSession.duration * 60,
                status: 'running',
                startTime: Date.now()
            });
            this.expectedEndTime = Date.now() + (this.currentSession.remainingSeconds * 1000);
            setTimeout(() => {
                this.startTimer();
                eventBus.emit('POMODORO_STARTED', this.currentSession);
            }, 1000);
        }

        // Eğer tüm döngü bittiyse (work bitti ve sessions dolduysa) event daha önce gönderildi
        if (finishedSession.type === 'work' && finishedSession.currentSessionIndex === finishedSession.totalSessions) {
            // No-op, already handled above
        } else if (finishedSession.type === 'break' || finishedSession.currentSessionIndex < finishedSession.totalSessions) {
            // Sadece tek oturum bittiğini haber ver (döngü devam ediyor)
            eventBus.emit('POMODORO_SESSION_COMPLETED', finishedSession);
        }
    }

    static async saveToHistory(session) {
        if (session.type !== 'work') return; // Sadece çalışma seanslarını kaydet
        const json = session.toJSON();

        await Database.run(
            'INSERT INTO pomodoro_history (id, name, duration, start_time, sessions) VALUES (?, ?, ?, ?, ?)',
            [json.id, json.name, json.duration, new Date(json.startTime).toISOString(), json.totalSessions || 1]
        );
    }

    static async getHistory() {
        return await Database.query('SELECT * FROM pomodoro_history ORDER BY created_at DESC');
    }

    static getActiveSession() {
        return this.currentSession;
    }
}
