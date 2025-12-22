/**
 * Database - SQLite veritabanı erişim katmanı (Renderer tarafı)
 * Electron Bridge üzerinden ana süreçteki SQLite ile konuşur.
 */
export class Database {
    static async query(sql, params = []) {
        try {
            return await window.electronAPI.dbQuery(sql, params);
        } catch (error) {
            console.error('Database Query Error:', error, { sql, params });
            throw error;
        }
    }

    static async run(sql, params = []) {
        try {
            return await window.electronAPI.dbRun(sql, params);
        } catch (error) {
            console.error('Database Run Error:', error, { sql, params });
            throw error;
        }
    }

    /**
     * Toplu sorgu çalıştırmak için yardımcı metod.
     */
    static async transaction(queries) {
        // SQLite'da gerçek bir transaction için IPC üzerinden özel bir handler gerekebilir.
        // Şimdilik basitçe döngü ile çalıştırıyoruz.
        for (const { sql, params } of queries) {
            await this.run(sql, params);
        }
    }
}
