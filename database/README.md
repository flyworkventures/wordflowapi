# MySQL/MariaDB Database Setup

Bu klasör phpMyAdmin'e import edilebilecek SQL scriptlerini içerir.

## Kurulum Adımları

### 1. phpMyAdmin'de Veritabanı Oluşturma

**Yöntem 1: GUI ile (Önerilen)**
1. phpMyAdmin'e giriş yapın
2. Sol menüden "Yeni" (New) butonuna tıklayın
3. Veritabanı adı: `wordapi` (veya istediğiniz isim)
4. Karakter seti: `utf8mb4_unicode_ci`
5. "Oluştur" (Create) butonuna tıklayın

**Yöntem 2: SQL ile (Eğer yetkiniz varsa)**
```sql
CREATE DATABASE wordapi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. SQL Script'i Import Etme

**ÖNEMLİ:** Veritabanınızı oluşturduktan sonra:

1. phpMyAdmin'de **veritabanınızı seçin** (sol menüden tıklayın)
2. Üst menüden **"SQL"** sekmesine tıklayın
3. `mysql_schema.sql` dosyasının içeriğini kopyalayıp yapıştırın
   - **NOT:** Script'te CREATE DATABASE komutu yok, sadece tablolar var
4. **"Git"** (Go) butonuna tıklayın

**VEYA:**
- "Import" sekmesinden dosyayı seçip yükleyin

### 3. Veritabanı Bağlantı Bilgileri

`.env` dosyanızda şu formatta ayarlayın:

```env
DATABASE_URL="mysql://kullanici:sifre@host:3306/wordapi"
```

**Örnekler:**

```env
# Local MySQL
DATABASE_URL="mysql://root:@localhost:3306/wordapi"

# Uzak MySQL (cPanel)
DATABASE_URL="mysql://cpanel_kullanici:sifre@mysql.host.com:3306/cpanel_db_adi"

# Uzak MySQL (Direct)
DATABASE_URL="mysql://myuser:mypassword@192.168.1.100:3306/wordapi"
```

### 4. Connection Pool Ayarları (Opsiyonel)

```env
DB_CONNECTION_LIMIT=10
DB_POOL_TIMEOUT=20
DB_CONNECT_TIMEOUT=10
DB_SOCKET_TIMEOUT=30
DB_SSL=false
```

## Tablo Yapısı

### Word
- Kelime bilgileri ve çevirileri
- UUID string ID
- Unique word constraint

### User
- Kullanıcı bilgileri
- Auto increment integer ID
- Unique email constraint

### SocialAccount
- Sosyal medya hesapları (Google, Apple, Facebook)
- User ile CASCADE ilişkisi

### Notification
- Kullanıcı bildirimleri
- User ile CASCADE ilişkisi

### Quiz
- Quiz soruları ve cevapları
- UUID string ID

## Önemli Notlar

1. **UUID Generation**: Prisma application seviyesinde UUID generate eder, MySQL'in UUID() fonksiyonunu kullanmaz
2. **Character Set**: Tüm tablolar `utf8mb4_unicode_ci` kullanır (Türkçe karakter desteği için)
3. **Foreign Keys**: CASCADE delete/update ile yapılandırılmıştır
4. **Indexes**: Performans için gerekli index'ler eklenmiştir

## Sorun Giderme

### Hata: "Table already exists"
- Tablolar zaten varsa, script IF NOT EXISTS kullanır, sorun olmaz
- Eğer farklı yapıda tablolar varsa, önce DROP edin

### Hata: "Foreign key constraint fails"
- Tabloları doğru sırayla oluşturduğunuzdan emin olun
- User tablosu SocialAccount ve Notification'dan önce oluşturulmalı

### Hata: "Access denied"
- MySQL kullanıcısının CREATE, ALTER, INDEX izinlerine sahip olduğundan emin olun

