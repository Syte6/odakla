import { HabitService } from '../infrastructure/HabitService.js';
import { TaskService } from '../infrastructure/TaskService.js';
import { eventBus } from '../infrastructure/EventBus.js';
import { NotificationService } from '../infrastructure/NotificationService.js';
import { PomodoroService } from '../infrastructure/PomodoroService.js';
import { AiCoachService } from '../infrastructure/AiCoachService.js';
import { GoalService } from '../infrastructure/GoalService.js';
import { MigrationService } from '../infrastructure/MigrationService.js';

/**
 * App - Uygulamanın ana kontrol noktası (Entry Point)
 * Yenilenmiş tasarım ve Pomodoro akışına göre revize edildi.
 */
class App {
    constructor() {
        window.app = this;
        this.selectedDuration = 25;
        this.selectedHabitIncrements = {}; // Eklenecek miktar takibi için
        this.aiCoachInitialized = false; // AI Koç'un bir kez çalışması için flag
        this.init();
    }

    async init() {
        console.log('Odakla (Desktop) Başlatıldı');

        // 1. Veri Migrasyonu (localStorage -> SQLite)
        await MigrationService.migrate();

        // 2. Olay Dinleyicileri ve UI Hazırlığı
        this.setupEventListeners();
        this.setupPomodoroEvents();
        this.setupUpdateEvents();
        this.updateDate();

        // 3. Verileri Çek ve Render Et
        await this.renderAll();

        // 4. Bildirim izni iste
        await NotificationService.requestPermission();
    }

    async renderAll() {
        await Promise.all([
            this.renderHabits(),
            this.renderTasks(),
            this.updateStats()
        ]);
    }

    setupEventListeners() {
        // --- Global Olaylar ---
        eventBus.on('HABIT_ADDED', async () => { await this.renderHabits(); this.closeModal('habit-modal'); await this.updateStats(); });
        eventBus.on('PROGRESS_UPDATED', async () => { await this.renderHabits(); await this.updateStats(); });
        eventBus.on('TASK_ADDED', async () => { await this.renderTasks(); this.closeModal('task-modal'); await this.updateStats(); });
        eventBus.on('TASK_UPDATED', async () => { await this.renderTasks(); await this.updateStats(); });
        eventBus.on('TASK_DELETED', async () => { await this.renderTasks(); await this.updateStats(); });
        eventBus.on('GOAL_ADDED', async () => { await this.renderGoals(); await this.updateStats(); });
        eventBus.on('GOAL_UPDATED', async () => { await this.renderGoals(); await this.updateStats(); });
        eventBus.on('GOAL_DELETED', async () => { await this.renderGoals(); await this.updateStats(); });

        // --- Alışkanlık Modal Yönetimi ---
        const addHabitBtn = document.getElementById('add-habit-btn');
        const closeHabitBtn = document.getElementById('close-modal');
        const habitModal = document.getElementById('habit-modal');
        const habitForm = document.getElementById('habit-form');
        const typeSelect = document.getElementById('habit-type');

        const updateHabitForm = () => {
            const type = typeSelect.value;
            const goalContainer = document.getElementById('goal-container');
            const unitContainer = document.getElementById('unit-container');
            const goalLabel = document.getElementById('goal-label');

            if (type === 'yes-no') {
                goalContainer.classList.add('hidden');
                unitContainer.classList.add('hidden');
            } else if (type === 'duration') {
                goalContainer.classList.remove('hidden');
                unitContainer.classList.add('hidden');
                goalLabel.textContent = 'Günlük Hedef (Dakika)';
            } else {
                goalContainer.classList.remove('hidden');
                unitContainer.classList.remove('hidden');
                goalLabel.textContent = 'Günlük Hedef';
            }
        };

        typeSelect?.addEventListener('change', updateHabitForm);
        addHabitBtn?.addEventListener('click', () => { updateHabitForm(); habitModal.classList.remove('hidden'); });
        closeHabitBtn?.addEventListener('click', () => this.closeModal('habit-modal'));

        habitForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const habitData = {
                title: document.getElementById('habit-title').value,
                type: typeSelect.value,
                goal: Number(document.getElementById('habit-goal').value),
                unit: document.getElementById('habit-unit').value,
                pomodoroDuration: Number(document.getElementById('habit-pomodoro').value)
            };
            await HabitService.addHabit(habitData);
            habitForm.reset();
        });

        // --- Görev Modal Yönetimi ---
        const addTaskBtn = document.getElementById('add-task-btn');
        const closeTaskBtn = document.getElementById('close-task-modal');
        const taskModal = document.getElementById('task-modal');
        const taskForm = document.getElementById('task-form');
        const reminderToggle = document.getElementById('task-reminder-toggle');
        const reminderContainer = document.getElementById('reminder-container');

        reminderToggle?.addEventListener('change', () => {
            reminderContainer.classList.toggle('hidden', !reminderToggle.checked);
        });

        addTaskBtn?.addEventListener('click', () => taskModal.classList.remove('hidden'));
        closeTaskBtn?.addEventListener('click', () => this.closeModal('task-modal'));

        taskForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tagsElement = document.getElementById('task-tags');
            const tagsInput = tagsElement ? tagsElement.value : '';
            const taskData = {
                title: document.getElementById('task-title').value,
                priority: document.getElementById('task-priority').value,
                deadline: document.getElementById('task-deadline').value || null,
                location: document.getElementById('task-location').value || '',
                notes: document.getElementById('task-notes').value || '',
                tags: tagsInput ? tagsInput.split(',').map(s => s.trim()) : [],
                reminderAt: reminderToggle.checked ? document.getElementById('task-reminder').value : null
            };
            await TaskService.addTask(taskData);
            taskForm.reset();
            reminderContainer.classList.add('hidden');
        });

        // --- Yeni Pomodoro Akışı Listenerları ---
        const openPomoBtn = document.getElementById('open-pomodoro-setup');
        const pomoSetupModal = document.getElementById('pomodoro-setup-modal');
        const cancelPomoBtn = document.getElementById('cancel-pomodoro-setup');
        const startPomoBtn = document.getElementById('start-pomodoro-btn');
        const durBtns = document.querySelectorAll('.dur-btn');

        openPomoBtn?.addEventListener('click', () => pomoSetupModal.classList.remove('hidden'));
        cancelPomoBtn?.addEventListener('click', () => pomoSetupModal.classList.add('hidden'));

        durBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                durBtns.forEach(b => b.classList.remove('border-primary', 'text-primary', 'bg-primary/10'));
                durBtns.forEach(b => b.classList.add('border-surface-border', 'text-white'));
                btn.classList.remove('border-surface-border', 'text-white');
                btn.classList.add('border-primary', 'text-primary', 'bg-primary/10');
                this.selectedDuration = Number(btn.dataset.min);
            });
        });

        startPomoBtn?.addEventListener('click', () => {
            const name = document.getElementById('pomodoro-name').value || 'Odak Seansı';
            const sessions = Number(document.getElementById('pomo-sessions').value);
            const workDuration = Number(document.getElementById('pomo-work-dur').value);
            const breakDuration = Number(document.getElementById('pomo-break-dur').value);

            pomoSetupModal.classList.add('hidden');
            PomodoroService.startCycle({
                habitId: null,
                name: name,
                workDuration: workDuration,
                breakDuration: breakDuration,
                sessions: sessions
            });
        });

        // Monthly Goals logic
        const addGoalBtn = document.getElementById('add-goal-btn');
        const goalModal = document.getElementById('goal-modal');
        const goalForm = document.getElementById('goal-form');
        const closeGoalModal = document.getElementById('close-goal-modal');

        addGoalBtn?.addEventListener('click', () => goalModal.classList.remove('hidden'));
        closeGoalModal?.addEventListener('click', () => goalModal.classList.add('hidden'));

        goalForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('goal-title');
            if (titleInput.value.trim()) {
                await GoalService.addGoal(titleInput.value.trim());
                goalForm.reset();
                goalModal.classList.add('hidden');
            }
        });

        // Notification Toggle Logic
        const notifToggleBtn = document.getElementById('toggle-notifications-btn');
        const updateNotifUI = () => {
            const icon = notifToggleBtn?.querySelector('span');
            if (icon) {
                icon.textContent = NotificationService.isMuted ? 'notifications_off' : 'notifications_active';
                notifToggleBtn.classList.toggle('text-primary', !NotificationService.isMuted);
                notifToggleBtn.classList.toggle('text-text-secondary', NotificationService.isMuted);
            }
        };
        updateNotifUI();
        console.log("App.js: NotificationService kontrolü ->", NotificationService);

        notifToggleBtn?.addEventListener('click', () => {
            NotificationService.toggleMute();
            updateNotifUI();
        });

        // Modalların dışına tıklayınca kapatma
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('bg-background-dark/80') || e.target.classList.contains('bg-background-dark/95')) {
                e.target.classList.add('hidden');
            }
        });
    }

    async renderGoals() {
        const container = document.getElementById('goals-list');
        if (!container) return;
        const goals = await GoalService.getAllGoals();

        if (goals.length === 0) {
            container.innerHTML = '<p class="text-text-secondary text-sm italic">Henüz bir aylık hedef belirlemedin.</p>';
            return;
        }

        container.innerHTML = goals.map(goal => `
            <div class="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                <div class="flex items-center gap-3">
                    <button onclick="window.app.toggleGoal('${goal.id}')" class="size-6 rounded-full border-2 ${goal.status === 'completed' ? 'bg-primary border-primary' : 'border-surface-border'} flex items-center justify-center transition-all">
                        ${goal.status === 'completed' ? '<span class="material-symbols-outlined text-background-dark text-sm font-black">check</span>' : ''}
                    </button>
                    <span class="text-sm ${goal.status === 'completed' ? 'text-text-secondary line-through' : 'text-white'} font-medium">${goal.title}</span>
                </div>
                <button onclick="window.app.deleteGoal('${goal.id}')" class="opacity-0 group-hover:opacity-100 p-2 text-text-secondary hover:text-error transition-all">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </div>
        `).join('');
    }

    async toggleGoal(id) {
        await GoalService.toggleGoalStatus(id);
    }

    async deleteGoal(id) {
        if (!confirm('Bu hedefi silmek istediğine emin misin?')) return;
        await GoalService.deleteGoal(id);
    }

    setupPomodoroEvents() {
        const overlay = document.getElementById('pomodoro-overlay');
        const minDisplay = document.getElementById('timer-minutes');
        const secDisplay = document.getElementById('timer-seconds');
        const pomoTitle = document.getElementById('pomo-display-name');

        const toggleBtn = document.getElementById('pomodoro-toggle-btn');
        const toggleIcon = document.getElementById('pomo-toggle-icon');
        const endBtn = document.getElementById('pomodoro-end-btn');
        const backBtn = document.getElementById('back-to-dash');
        const quoteDisplay = document.getElementById('motivational-quote');

        const quotes = [
            "Her gün atılan küçük adımlar, büyük sonuçlara yol açar.",
            "Odaklanmak, hayır diyebilme sanatıdır.",
            "Zamanını planla, hayatını yönet.",
            "Derin çalışma, modern dünyanın süper gücüdür.",
            "Sadece başla, gerisi gelecektir."
        ];

        eventBus.on('POMODORO_TICK', (session) => {
            const mins = Math.max(0, Math.floor(session.remainingSeconds / 60));
            const secs = Math.max(0, session.remainingSeconds % 60);
            minDisplay.textContent = mins.toString().padStart(2, '0');
            secDisplay.textContent = secs.toString().padStart(2, '0');
            document.title = `(${minDisplay.textContent}:${secDisplay.textContent}) Odakla`;
        });

        eventBus.on('POMODORO_STARTED', (session) => {
            const isBreak = session.type === 'break';
            pomoTitle.textContent = isBreak ? 'Mola Zamanı ☕' : (session.name || 'Odak Seansı');
            overlay.classList.remove('hidden');
            toggleIcon.textContent = 'pause';

            // Oturum Durumu (1 / 5 Oturum)
            const typeLabel = isBreak ? 'Mola' : 'Odak';
            const statusTag = overlay.querySelector('.px-3.py-1.rounded-full span');
            if (statusTag) {
                statusTag.textContent = `${session.currentSessionIndex} / ${session.totalSessions} ${typeLabel}`;
            }

            quoteDisplay.textContent = isBreak ? "Dinlenmek, yolun yarısıdır." : quotes[Math.floor(Math.random() * quotes.length)];

            // Bildirim Gönder
            if (isBreak) {
                NotificationService.sendNotification("Mola Zamanı! ☕", {
                    body: "Zihnini dinlendirmek için kısa bir mola... Hazır mısın?"
                });
            } else {
                NotificationService.sendNotification(session.currentSessionIndex === 1 ? "Odak Başladı! 🚀" : "Mola Bitti, Devam! 🔥", {
                    body: `${session.name || 'Odak Seansı'} için derin çalışma başlıyor.`
                });
            }
        });

        eventBus.on('POMODORO_PAUSED', () => {
            toggleIcon.textContent = 'play_arrow';
        });

        eventBus.on('POMODORO_RESUMED', () => {
            toggleIcon.textContent = 'pause';
        });

        const closeOverlay = () => {
            overlay.classList.add('hidden');
            this.stopFocusSound();
            document.title = 'Odakla - Ana Sayfa';
        };

        eventBus.on('POMODORO_CANCELLED', closeOverlay);

        eventBus.on('POMODORO_FINISHED', async (session) => {
            this.stopFocusSound();
            await this.updateStats();
            NotificationService.sendNotification("Döngü Tamamlandı! 🎉", {
                body: "Tebrikler! Belirlediğin tüm odak seanslarını başarıyla bitirdin."
            });
            alert('Tebrikler! Tüm odak döngüsünü tamamladın. Harika bir iş çıkardın! 🎉');
            closeOverlay();
        });

        toggleBtn?.addEventListener('click', () => {
            const session = PomodoroService.getActiveSession();
            if (session.status === 'running') PomodoroService.pauseSession();
            else PomodoroService.resumeSession();
        });

        const handleCancel = () => {
            if (confirm('Odak seansını sonlandırmak istediğine emin misin?')) {
                PomodoroService.cancelSession();
            }
        };

        endBtn?.addEventListener('click', handleCancel);
        backBtn?.addEventListener('click', handleCancel);

        // Ses Seçimi (Sound Chips)
        const soundChips = document.querySelectorAll('.sound-chip');
        soundChips.forEach(chip => {
            chip.addEventListener('click', () => {
                soundChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.playFocusSound(chip.dataset.sound);
            });
        });
    }

    async renderHabits() {
        const container = document.getElementById('habits-list');
        const [habits, progresses] = await Promise.all([
            HabitService.getAllHabits(),
            HabitService.getTodayProgress()
        ]);

        if (habits.length === 0) {
            container.innerHTML = '<p class="text-text-secondary text-sm">Henüz alışkanlık eklenmedi.</p>';
            return;
        }

        container.classList.add('scrollable-list');
        container.innerHTML = habits.map(habit => {
            const progress = progresses.find(p => p.habitId === habit.id) || { value: 0, completed: false };
            const isCompleted = progress.completed;
            const isYesNo = habit.type === 'yes-no';

            // Kalan hedef miktarını hesapla
            const remGoal = Math.max(0, habit.goal - progress.value);

            // Seçili eklenecek miktarı belirle (Varsayılan: 1, Kalan hedeften büyük olamaz)
            if (!isCompleted && !isYesNo) {
                if (this.selectedHabitIncrements[habit.id] === undefined) {
                    this.selectedHabitIncrements[habit.id] = Math.min(1, remGoal);
                } else if (this.selectedHabitIncrements[habit.id] > remGoal) {
                    this.selectedHabitIncrements[habit.id] = remGoal;
                }
            }
            const displayIncrement = this.selectedHabitIncrements[habit.id] || (remGoal > 0 ? 1 : 0);
            const percent = isYesNo ? (isCompleted ? 100 : 0) : Math.min(Math.round((progress.value / habit.goal) * 100), 100);
            const progressBg = isCompleted ? '' : `style="background: linear-gradient(90deg, rgba(28, 227, 108, 0.1) ${percent}%, transparent ${percent}%);"`;

            return `
                <div class="group flex items-center gap-4 p-4 rounded-xl bg-surface-dark border border-surface-border/50 transition-all ${isCompleted ? 'opacity-60 cursor-default' : 'hover:border-primary/50 cursor-pointer'}" ${progressBg}>
                    <div class="relative flex items-center ${isCompleted ? '' : 'btn-complete-habit'}" data-id="${habit.id}">
                        <div class="h-6 w-6 rounded-full border-2 border-surface-border flex items-center justify-center transition-all ${isCompleted ? 'bg-primary border-primary' : 'group-hover:border-primary'}">
                            ${isCompleted ? '<span class="material-symbols-outlined text-background-dark text-xs font-bold">check</span>' : ''}
                        </div>
                    </div>
                    <div class="flex flex-col flex-1">
                        <span class="text-white font-medium ${isCompleted ? 'line-through text-text-secondary' : 'group-hover:text-primary'} transition-colors">${habit.title}</span>
                        <span class="text-text-secondary text-xs">${isYesNo ? (isCompleted ? 'Yapıldı' : 'Bugün henüz yapılmadı') : `${progress.value} / ${habit.goal} ${habit.unit || ''}`}</span>
                    </div>
                    <div class="flex items-center gap-2">
                         ${!isYesNo && !isCompleted ? `
                            <div class="flex items-center gap-2 bg-background-dark/50 rounded-lg p-1 border border-surface-border/30">
                                <div class="flex items-center gap-2 bg-background-dark rounded-md px-2 py-0.5 border border-surface-border/20">
                                    <button class="btn-habit-minus text-text-secondary hover:text-white px-1 font-bold transition-colors" data-id="${habit.id}">-</button>
                                    <span class="text-primary font-bold text-xs min-w-[20px] text-center">+${displayIncrement}</span>
                                    <button class="btn-habit-plus text-text-secondary hover:text-white px-1 font-bold transition-colors" data-id="${habit.id}">+</button>
                                </div>
                                <button class="btn-complete-habit bg-primary text-background-dark hover:bg-primary-hover text-[10px] font-black px-4 py-2 rounded-md transition-all shadow-lg shadow-primary/10" data-id="${habit.id}">Bitir</button>
                            </div>
                         ` : ''}
                         ${isCompleted ? '<span class="text-primary text-[10px] font-bold tracking-widest uppercase px-2 py-1 bg-primary/10 rounded-lg border border-primary/20">Tamamlandı</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.bindHabitActions();
    }

    bindHabitActions() {
        document.querySelectorAll('.btn-complete-habit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const [habits, progresses] = await Promise.all([
                    HabitService.getAllHabits(),
                    HabitService.getTodayProgress()
                ]);
                const habit = habits.find(h => h.id === id);
                const progress = progresses.find(p => p.habitId === id);

                if (progress?.completed) return;

                // Ekle ve Kaydet
                let amountToAdd = 1;
                if (habit.type !== 'yes-no') {
                    amountToAdd = this.selectedHabitIncrements[id] || 0;
                }

                const currentValue = progress?.value || 0;
                await HabitService.updateProgress(id, currentValue + amountToAdd);

                // Sıfırla (Ama render zaten bunu varsayılan 1 yapacak, güvenli temizlik)
                this.selectedHabitIncrements[id] = 1;
                await this.renderHabits();
            });
        });

        document.querySelectorAll('.btn-habit-plus').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const [habits, progresses] = await Promise.all([
                    HabitService.getAllHabits(),
                    HabitService.getTodayProgress()
                ]);
                const habit = habits.find(h => h.id === id);
                const progress = progresses.find(p => p.habitId === id)?.value || 0;
                const remGoal = habit.goal - progress;

                if (this.selectedHabitIncrements[id] === undefined) this.selectedHabitIncrements[id] = 1;

                if (this.selectedHabitIncrements[id] < remGoal) {
                    this.selectedHabitIncrements[id]++;
                }
                await this.renderHabits();
            });
        });

        document.querySelectorAll('.btn-habit-minus').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (this.selectedHabitIncrements[id] === undefined) this.selectedHabitIncrements[id] = 1;
                if (this.selectedHabitIncrements[id] > 1) {
                    this.selectedHabitIncrements[id]--;
                }
                await this.renderHabits();
            });
        });
    }

    async renderTasks() {
        const container = document.getElementById('tasks-list');
        const allTasks = await TaskService.getAllTasks();

        // Tüm görevleri getir ve sırala (Aktif olanlar üste, tamamlananlar alta)
        const tasks = allTasks.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

        if (tasks.length === 0) {
            container.innerHTML = '<p class="text-text-secondary text-sm">Bugün için görev yok.</p>';
            return;
        }

        container.classList.add('scrollable-list');
        container.innerHTML = tasks.map(task => {
            const priorityColors = { high: 'orange-400', medium: 'primary', low: 'blue-400' };
            const pColor = priorityColors[task.priority] || 'primary';
            const deadlineInfo = task.deadline ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">calendar_today</span>${new Date(task.deadline).toLocaleDateString('tr-TR')}</div>` : '';

            return `
                <div class="group flex items-start gap-4 p-4 rounded-xl bg-surface-dark border-l-4 ${task.completed ? 'border-l-text-secondary/30 opacity-60' : 'border-l-' + (pColor === 'primary' ? '[#1ce36c]' : pColor)} border-y border-r border-surface-border/50 transition-all">
                    <div class="${task.completed ? '' : 'btn-complete-task'} mt-1 size-5 rounded-md border-2 ${task.completed ? 'bg-primary border-primary' : 'border-text-secondary hover:border-primary'} flex items-center justify-center transition-colors cursor-pointer" data-id="${task.id}">
                        ${task.completed ? '<span class="material-symbols-outlined text-background-dark text-[14px] font-bold">check</span>' : ''}
                    </div>
                    <div class="flex flex-col flex-1 gap-1">
                        <div class="flex justify-between items-start">
                            <span class="text-white font-medium leading-tight ${task.completed ? 'line-through text-text-secondary' : ''}">${task.title}</span>
                            ${!task.completed ? `<span class="text-[10px] font-bold uppercase tracking-wide bg-${pColor === 'primary' ? 'primary/10 text-primary' : pColor + '/10 text-' + pColor} px-2 py-0.5 rounded">${task.priority}</span>` : ''}
                        </div>
                        <div class="flex items-center justify-between text-text-secondary text-[11px] mt-1">
                            <div class="flex items-center gap-3">
                                ${deadlineInfo}
                                ${task.location ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>${task.location}</div>` : ''}
                            </div>
                            ${!task.completed ? `
                                <button class="btn-complete-task bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold px-3 py-1.5 rounded-lg border border-primary/20 transition-all font-bold" data-id="${task.id}">Tamamla</button>
                            ` : '<span class="text-primary text-[10px] font-bold uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">Bitti</span>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.bindTaskActions();
    }

    bindTaskActions() {
        document.querySelectorAll('.btn-complete-task').forEach(btn => {
            btn.addEventListener('click', async () => {
                await TaskService.toggleTaskStatus(btn.dataset.id);
            });
        });
    }

    async updateStats() {
        // Verileri Topla
        const [tasks, history, habits, progresses] = await Promise.all([
            TaskService.getAllTasks(),
            PomodoroService.getHistory(),
            HabitService.getAllHabits(),
            HabitService.getTodayProgress()
        ]);

        // Tamamlanan Görevler
        const activeTasks = tasks.filter(t => !t.completed).length;
        const completedCount = tasks.filter(t => t.completed).length;
        document.getElementById('completed-tasks-count').textContent = `${completedCount} Görev`;

        // Toplam Odak Süresi (Sadece bugün)
        const today = new Date().toLocaleDateString();
        const todayFocusMinutes = history
            .filter(session => new Date(session.start_time).toLocaleDateString() === today)
            .reduce((total, session) => total + (session.duration || 0), 0);

        const hours = Math.floor(todayFocusMinutes / 60);
        const mins = todayFocusMinutes % 60;
        document.getElementById('total-focus-time').textContent = `${hours}s ${mins}dk`;

        // Alışkanlık İlerlemesi
        const completedHabits = progresses.filter(p => p.completed).length;
        const totalActiveHabits = habits.length;

        // Ai Coach Verilerini Topla
        const stats = {
            focusTime: todayFocusMinutes,
            completedTasks: completedCount,
            habitProgress: completedHabits,
            activeHabits: totalActiveHabits,
            streak: 0 // Şimdilik 0, ileride eklenebilir
        };

        await this.updateAICoach(stats);
        await this.renderHeatmap();
        this.renderPomoHistory(history);
        await this.renderGoals();
    }

    renderPomoHistory(history) {
        const container = document.getElementById('pomo-history-list');
        if (!container) return;

        const lastSessions = [...history].slice(0, 5); // SQL zaten DESC getiriyor
        if (lastSessions.length === 0) {
            container.innerHTML = '<p class="text-text-secondary text-xs italic">Henüz kaydedilmiş seans yok.</p>';
            return;
        }

        container.innerHTML = lastSessions.map(session => `
            <div class="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                <div class="flex items-center gap-3">
                    <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined text-[18px]">timer</span>
                    </div>
                    <div>
                        <p class="text-white text-sm font-bold group-hover:text-primary transition-colors">${session.name || 'Odak Seansı'}</p>
                        <p class="text-text-secondary text-[10px]">${new Date(session.start_time).toLocaleDateString()} · ${new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-white text-sm font-black">${session.duration}</span>
                    <span class="text-text-secondary text-[10px] ml-1">dk</span>
                </div>
            </div>
        `).join('');
    }

    async updateAICoach(stats) {
        const coachText = document.getElementById('ai-coach-text');
        const coachIcon = document.getElementById('ai-coach-icon');

        if (!coachText || this.aiCoachInitialized) return;

        // Yükleniyor durumu
        coachText.innerHTML = '<span class="animate-pulse">AI Koç verileri analiz ediyor...</span>';

        try {
            // Son 5 günün özetini AI'a göndermek için hazırla
            const allProgress = await window.electronAPI.dbQuery('SELECT * FROM progress_records WHERE completed = 1 AND date >= date("now", "-5 days")');
            const habits = await HabitService.getAllHabits();

            const recentHistory = [];
            for (let i = 1; i <= 5; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const iso = d.toISOString().split('T')[0];
                const completedCount = allProgress.filter(p => p.date === iso).length;
                recentHistory.push({ date: iso, rate: habits.length > 0 ? (completedCount / habits.length) : 0 });
            }

            const message = await AiCoachService.getRealMessage({ ...stats, recentHistory });
            coachText.textContent = `"${message.text}"`;

            if (coachIcon && message.icon) {
                coachIcon.textContent = message.icon;
            }

            this.aiCoachInitialized = true; // Sadece ilk açılışta çalışmasını sağla
        } catch (err) {
            console.error("AI Coach Update Error:", err);
            coachText.textContent = "Bugün odaklanmak için harika bir gün.";
        }
    }

    async renderHeatmap() {
        const container = document.getElementById('weekly-chart');
        if (!container) return;

        const [allHabits, allProgress] = await Promise.all([
            HabitService.getAllHabits(),
            // Tüm geçmiş progress verilerini çekmek için SQL sorgusu atalım
            window.electronAPI.dbQuery('SELECT * FROM progress_records WHERE completed = 1')
        ]);

        const daysToShow = 140; // 20 hafta
        const heatmapData = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            // Yerel formatta YYYY-MM-DD (HabitService ile senkron)
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const dateISO = `${y}-${m}-${d}`;
            const dateDisplay = date.toLocaleDateString('tr-TR');

            // O günün toplam alışkanlık sayısı
            const activeHabitsOnDay = allHabits.filter(h => {
                const createdDate = new Date(h.createdAt);
                createdDate.setHours(0, 0, 0, 0);
                return createdDate <= date;
            }).length;

            // O gün tamamlanan alışkanlıklar
            const completedOnDay = allProgress.filter(p => p.date === dateISO && p.completed).length;

            const rate = activeHabitsOnDay > 0 ? (completedOnDay / activeHabitsOnDay) : 0;
            heatmapData.push({ date: dateDisplay, rate });
        }

        container.innerHTML = `
            <div class="flex flex-col gap-3 w-full">
                <div class="flex justify-between items-center px-1">
                    <p class="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Alışkanlık Tutarlılığı (20 Hafta)</p>
                    <div class="flex gap-1 items-center">
                        <span class="text-[8px] text-text-secondary opacity-50 mr-1">Az</span>
                        <div class="size-2 bg-white/5 rounded-[1px]"></div>
                        <div class="size-2 bg-primary/20 rounded-[1px]"></div>
                        <div class="size-2 bg-primary/50 rounded-[1px]"></div>
                        <div class="size-2 bg-primary rounded-[1px]"></div>
                        <span class="text-[8px] text-text-secondary opacity-50 ml-1">Çok</span>
                    </div>
                </div>
                <div class="grid grid-flow-col grid-rows-7 gap-[3px] h-24 w-full overflow-hidden">
                    ${heatmapData.map(day => {
            let cellClass = 'bg-white/5';
            if (day.rate >= 1) cellClass = 'bg-primary';
            else if (day.rate >= 0.6) cellClass = 'bg-primary/60';
            else if (day.rate >= 0.3) cellClass = 'bg-primary/30';
            else if (day.rate > 0) cellClass = 'bg-primary/10';

            return `<div class="size-[7.5px] rounded-[1.5px] ${cellClass} transition-colors cursor-help" 
                                     title="${day.date}: %${Math.round(day.rate * 100)} tutarlılık"></div>`;
        }).join('')}
                </div>
            </div>
        `;
    }

    setupUpdateEvents() {
        const notification = document.getElementById('update-notification');
        const text = document.getElementById('update-text');
        const progressContainer = document.getElementById('update-progress-container');
        const progressBar = document.getElementById('update-progress-bar');
        const restartBtn = document.getElementById('restart-update-btn');
        const closeBtn = document.getElementById('close-update-notif');

        if (!notification) return;

        window.electronAPI.onUpdateAvailable(() => {
            notification.classList.remove('hidden');
            text.textContent = 'Yeni bir güncelleme mevcut. İndiriliyor...';
            progressContainer.classList.remove('hidden');
        });

        window.electronAPI.onUpdateProgress((percent) => {
            notification.classList.remove('hidden');
            progressBar.style.width = `${percent}%`;
        });

        window.electronAPI.onUpdateDownloaded(() => {
            text.textContent = 'Güncelleme hazır! Uygulamayı yeniden başlatın.';
            progressContainer.classList.add('hidden');
            restartBtn.classList.remove('hidden');
        });

        restartBtn.addEventListener('click', () => {
            window.electronAPI.installUpdate();
        });

        closeBtn.addEventListener('click', () => {
            notification.classList.add('hidden');
        });
    }

    playFocusSound(type) {
        const audio = document.getElementById('focus-audio');
        if (!audio || type === 'none') { audio?.pause(); return; }
        const soundUrls = {
            rain: 'https://www.soundjay.com/nature/rain-07.mp3',
            forest: 'https://www.soundjay.com/nature/forest-wind-01.mp3',
            waves: 'https://www.soundjay.com/nature/ocean-waves-1.mp3',
            lofi: 'https://stream.zeno.fm/0r0xa792kwzuv',
            storm: 'https://www.soundjay.com/nature/thunderstorm-01.mp3',
            cafe: 'https://www.soundjay.com/misc/sounds/street-market-1.mp3',
            fire: 'https://www.soundjay.com/nature/sounds/fire-1.mp3',
            white: 'https://www.soundjay.com/misc/sounds/white-noise-01.mp3'
        };
        if (soundUrls[type]) { audio.src = soundUrls[type]; audio.play().catch(() => { }); }
    }

    stopFocusSound() {
        const audio = document.getElementById('focus-audio');
        if (audio) { audio.pause(); audio.src = ''; }
    }

    closeModal(id) {
        document.getElementById(id)?.classList.add('hidden');
    }

    updateDate() {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        document.getElementById('date-display').textContent = new Date().toLocaleDateString('tr-TR', options);
    }
}

new App();
