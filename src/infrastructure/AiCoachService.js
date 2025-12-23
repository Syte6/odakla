/**
 * AiCoachService - Kullanıcı verilerine dayalı gerçek AI (Pollinations.ai) motivasyon mesajları üretir.
 */
export class AiCoachService {
    /**
     * Pollinations.ai üzerinden gerçek bir AI yanıtı alır.
     * @param {Object} stats - Kullanıcı verileri (focusTime, completedTasks, habitProgress, activeHabits, recentHistory)
     */
    static async getRealMessage(stats) {
        const { focusTime, completedTasks, habitProgress, activeHabits, recentHistory = [] } = stats;

        // Geçmiş verileri metinleştir
        const historyText = recentHistory.length > 0
            ? recentHistory.map(h => `- ${h.date}: %${Math.round(h.rate * 100)} başarı`).join('\n')
            : "Henüz geçmiş veri yok.";

        // Prompt oluşturma
        const prompt = `
            Sen "Odakla" uygulamasının motivasyonel AI koçusun. Kullanıcıya kısa (max 2 cümle), 
            samimi ve ilham verici bir geri bildirim ver. 
            Bugünkü veriler: 
            - Odak Süresi: ${focusTime} dakika
            - Tamamlanan Görev: ${completedTasks}
            - Alışkanlık İlerlemesi: ${habitProgress}/${activeHabits}
            Son 5 günün alışkanlık tutarlılığı:
            ${historyText}
            Kullanıcıyı yargılama, sadece onun gelişim yolculuğuna eşlik et. Türkçe cevap ver.
            Verileri kullanma amacın bir analiz yapmak değil kullanıcının durumunu öğrenip ona göre ilham verici bir mesaj vermek.
            İstisna:
                Kullanıcı verileri boş ise uygulamayı henüz yeni kullanmaya başlıyor demektir. 
                Bunun için kullanıcıyı motive etmek için kısa ve ilham verici bir mesaj ver.
        `.trim();

        try {
            // Pollinations.ai Text API kullanımı
            const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&system=Sen%20yardımsever%20ve%20kısa%20konuşan%20bir%20koçsun.`);

            if (!response.ok) throw new Error('AI API hatası');

            const text = await response.text();

            // Verilere göre en uygun ikonu seç
            let icon = "auto_awesome";
            if (focusTime > 120) icon = "military_tech";
            else if (completedTasks > 3) icon = "rocket_launch";
            else if (habitProgress === activeHabits && activeHabits > 0) icon = "verified";
            else if (focusTime > 0) icon = "local_fire_department";

            return {
                text: text.trim().replace(/^"|"$/g, ''), // Tırnakları temizle
                icon: icon,
                type: "ai-generated"
            };
        } catch (error) {
            console.error("AI Koç Hatası:", error);
            // Fallback: Statik mesaj döndür
            return this.getFallbackMessage(stats);
        }
    }

    static getFallbackMessage(stats) {
        const { focusTime } = stats;
        if (focusTime === 0) {
            return {
                text: "Bugün yeni bir başlangıç için harika bir gün. Küçük bir adımla başlamaya ne dersin?",
                icon: "auto_awesome",
                type: "fallback"
            };
        }
        return {
            text: "Adım adım ilerlemek, hiç ilerlememekten iyidir. Harika bir iş çıkarıyorsun.",
            icon: "sentiment_satisfied",
            type: "fallback"
        };
    }
}
