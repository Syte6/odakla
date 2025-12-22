console.log("NotificationService.js: Yükleniyor (v2)...");

export class NotificationService {
    static isMuted = localStorage.getItem('odakla_notif_muted') === 'true';
    static alertAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Premium bildirim sesi

    static async requestPermission() {
        if (!("Notification" in window)) return false;
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    static toggleMute() {
        console.log("NotificationService: toggleMute tetiklendi. Mevcut durum:", this.isMuted);
        this.isMuted = !this.isMuted;
        localStorage.setItem('odakla_notif_muted', this.isMuted.toString());
        return this.isMuted;
    }

    static playAlert() {
        this.alertAudio.currentTime = 0;
        this.alertAudio.play().catch(e => console.warn("Ses çalınamadı (etkileşim gerekli):", e));
    }

    static sendNotification(title, options = {}) {
        if (!("Notification" in window)) return;

        // Her zaman ses çal (Kullanıcı mutememişse)
        if (!this.isMuted) {
            this.playAlert();
        }

        if (Notification.permission === "granted") {
            try {
                const notification = new Notification(title, {
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    silent: true, // Tarayıcı sesini kapat, biz çalıyoruz
                    ...options
                });

                notification.onclick = function () {
                    window.focus();
                    this.close();
                };
            } catch (err) {
                console.error("Bildirim servisi: Gönderim hatası ->", err);
            }
        }
    }
}

/**
 * ReminderService - Hatırlatıcıların zamanlamasını kontrol eder.
 * 'Catch-up' mantığı ile geçmişe dönük (makul süre) kontrolleri de yapar.
 */
export class ReminderService {
    static interval = null;
    static notifiedTasks = new Set(); // Bildirimi gitmiş görevlerin ID-Zaman eşleşmesi

    /**
     * Kontrol mekanizmasını başlatır.
     * Artık statik bir liste yerine latestTasksFetcher fonksiyonu alarak 
     * verinin her zaman güncel olduğundan emin olur.
     */
    static startChecking(latestTasksFetcher) {
        if (this.interval) clearInterval(this.interval);

        console.log("Hatırlatıcı Servisi: Aktif");

        this.interval = setInterval(() => {
            const tasks = latestTasksFetcher();
            const now = new Date();
            const nowMs = now.getTime();

            tasks.forEach(task => {
                if (!task.completed && task.reminderAt) {
                    const rDate = new Date(task.reminderAt);
                    const rMs = rDate.getTime();

                    // MANTIK: 
                    // 1. Hatırlatma zamanı gelmiş veya üzerinden çok az geçmiş mi? (Maks 5 dakika gecikme payı)
                    // 2. Bu görev için daha önce bildirim GÖNDERİLMEDİ Mİ?
                    // (Gelecekteki bildirimleri tetiklemez: rMs <= nowMs)

                    const timeDiff = nowMs - rMs;

                    if (timeDiff >= 0 && timeDiff < 300000) { // Şu an veya son 5 dakika içinde
                        const reminderKey = `${task.id}-${task.reminderAt}`; // Benzersiz anahtar

                        if (!this.notifiedTasks.has(reminderKey)) {
                            console.log(`BİLDİRİM TETİKLENİYOR: ${task.title}`);

                            NotificationService.sendNotification("Odakla Hatırlatıcı ⏰", {
                                body: task.title,
                                tag: task.id,
                                requireInteraction: true
                            });

                            this.notifiedTasks.add(reminderKey);

                            // Bellek yönetimi: Çok eski keyleri silebiliriz (opsiyonel)
                            if (this.notifiedTasks.size > 200) this.notifiedTasks.clear();
                        }
                    }
                }
            });
        }, 10000); // 10 saniyede bir kontrol (Gecikmeyi minimize eder)
    }
}
