/**
 * StorageService - LocalStorage yönetimi
 * Verilerin JSON formatında saklanmasını ve okunmasını sağlar.
 */
export class StorageService {
    /**
     * Belirtilen anahtardaki veriyi getirir.
     * @param {string} key - Anahtar adı
     * @param {any} defaultValue - Eğer veri yoksa dönülecek varsayılan değer
     */
    static get(key, defaultValue = []) {
        const data = localStorage.getItem(key);
        try {
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`StorageService Get Error (${key}):`, error);
            return defaultValue;
        }
    }

    /**
     * Veriyi kaydeder.
     * @param {string} key - Anahtar adı
     * @param {any} value - Kaydedilecek veri
     */
    static save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`StorageService Save Error (${key}):`, error);
        }
    }

    /**
     * Belirli bir öğeyi listeden günceller veya ekler.
     * @param {string} key - Liste anahtarı
     * @param {object} item - Öğe
     * @param {string} identifier - Kıyaslama yapılacak alan (varsayılan: id)
     */
    static upsertItem(key, item, identifier = 'id') {
        const list = this.get(key);
        const index = list.findIndex(i => i[identifier] === item[identifier]);

        if (index > -1) {
            list[index] = item;
        } else {
            list.push(item);
        }

        this.save(key, list);
    }

    /**
     * Belirli bir öğeyi listeden siler.
     * @param {string} key - Liste anahtarı
     * @param {any} id - Silinecek öğenin id'si
     */
    static removeItem(key, id) {
        const list = this.get(key);
        const filtered = list.filter(item => item.id !== id);
        this.save(key, filtered);
    }
}
