/**
 * EventBus - Modüller arası iletişim (Pub/Sub)
 * Uygulamanın farklı kısımlarının birbirini bilmeden haberleşmesini sağlar.
 */
class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * Bir olaya abone olur.
   * @param {string} event - Olay adı
   * @param {function} callback - Çalıştırılacak fonksiyon
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Aboneliği iptal etmek için bir fonksiyon döner
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Bir olayı tetikler.
   * @param {string} event - Olay adı
   * @param {any} data - Gönderilecek veri
   */
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

export const eventBus = new EventBus();
