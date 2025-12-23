# Odakla 🚀

> **Premium Odak ve Alışkanlık Takip Uygulaması**

Odakla, üretkenliğinizi artırmak, alışkanlıklarınızı profesyonelce takip etmek ve odaklanma sürelerinizi yönetmek için tasarlanmış, **Electron** tabanlı şık bir masaüstü uygulamasıdır. **Clean Architecture** prensipleriyle inşa edilmiş olup, yerel veri güvenliği ve yapay zeka destekli koçluk özellikleriyle donatılmıştır.

---

## 📦 Sürüm Geçmişi & İndirme

Uygulamanın en son sürümlerine GitHub [Releases](https://github.com/Syte6/odakla/releases) sayfasından ulaşabilirsiniz.

| Versiyon | Tarih | Yenilikler | İndir |
| :--- | :--- | :--- | :--- |
| **v1.0.3** | 23.12.2025 | Yeni odaklanma sesleri eklendi, bildirim sessize alma ile DND entegrasyonu yapıldı ve geri bildirim butonu eklendi. | [Windows (exe)](https://github.com/Syte6/odakla/releases/tag/v1.0.3) / [Linux (AppImage)](https://github.com/Syte6/odakla/releases/tag/v1.0.3) |
| **v1.0.0** | 22.12.2025 | İlk Kararlı Sürüm, AI Koç, Pomodoro & Alışkanlık Takibi | [Windows (exe)](https://github.com/Syte6/odakla/releases/tag/v1.0.0) / [Linux (AppImage)](https://github.com/Syte6/odakla/releases/tag/v1.0.0) |

---


## ✨ Özellikler

- 🍏 **Premium Tasarım**: Modern, karanlık mod odaklı ve göz yormayan estetik arayüz.
- ⏱️ **Gelişmiş Pomodoro**: Çok oturumlu (multi-session) seanslar, odak sesleri (Yağmur, Kafe, Lofi vb.) ve seans geçmişi.
- 🧘 **Alışkanlık Takibi**: "Artımlı Kayıt" sistemiyle günlük alışkanlıklarınızı (Su, Kitap, Spor vb.) detaylıca izleyin.
- 🤖 **Gerçek AI Koç**: Pollinations.ai entegrasyonu ile verilerinizi analiz eden ve size özel motivasyon mesajları üreten akıllı koç.
- 📊 **Veri Görselleştirme**: 20 haftalık tutarlılık heatmap'i ve günlük aktivite grafikleriyle gelişiminizi izleyin.
- 🏠 **Yerel ve Güvenli**: Verileriniz bulutta değil, bilgisayarınızdaki yerel **SQLite** veritabanında saklanır.
- 🔄 **Otomatik Güncelleme**: Uygulama içi güncelleme sistemiyle her zaman en güncel sürüme sahip olun.

---

## 🛠️ Teknoloji Yığını

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript (ES Module)
- **Runtime**: Electron (Masaüstü Dönüşümü)
- **Veritabanı**: SQLite (Yerel Depolama)
- **AI**: Pollinations.ai (Metin Üretimi)
- **Mimari**: Clean Architecture (Domain, Infrastructure, Presentation ayrımı)
- **İletişim**: IPC (Inter-Process Communication)

---

## 🚀 Kurulum

Projeyi yerelinizde çalıştırmak için aşağıdaki adımları takip edebilirsiniz.

1.  **Depoyu Klonlayın**:
    ```bash
    git clone https://github.com/Syte6/odakla.git
    cd odakla
    ```

2.  **Bağımlılıkları Yükleyin**:
    ```bash
    npm install
    ```

3.  **Uygulamayı Başlatın**:
    ```bash
    npm start
    ```

---

## 📂 Dosya Yapısı

```text
odakla/
├── main.js              # Electron Ana Süreci
├── preload.js           # Güvenli IPC Köprüsü
├── index.html           # Ana Giriş Noktası
├── src/
│   ├── assets/          # CSS, İkonlar ve Sesler
│   ├── domain/          # Saf İş Mantığı (Entities)
│   ├── infrastructure/  # Veritabanı ve AI Servisleri
│   └── presentation/    # UI Mantığı (App.js)
└── package.json         # Bağımlılıklar ve Komutlar
```

---

## 🛡️ Gizlilik ve Güvenlik

Odakla, gizlilik odaklı bir uygulamadır:
- Hiçbir kullanıcı verisi harici bir sunucuya (AI prompt verileri hariç) gönderilmez.
- Tüm geçmişiniz ve ayarlarınız `.db` dosyasında şifrelenmeden şeffaf bir şekilde tutulur.
- Electron `contextIsolation` ve `no-sandbox` (Linux uyumluluğu için) yapılandırmalarıyla güvenli köprüleme kullanır.

---

## 🤝 Katkıda Bulunma

1. Projeyi fork'layın.
2. Yeni bir feature branch açın (`git checkout -b feature/YeniOzellik`).
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`).
4. Branch'inizi push edin (`git push origin feature/YeniOzellik`).
5. Bir Pull Request açın.

---

## 📜 Lisans

Bu proje **MIT** lisansı ile lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakınız.

---

*Geliştiren: Syte6 - Odaklanmanın en premium yolu.*
# odakla
