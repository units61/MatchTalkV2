# Sentry Entegrasyonu - Adım Adım Kurulum

## 1. Sentry Projesi Oluşturma

1. **Sentry.io'ya git:** https://sentry.io
2. **Login ol** veya **hesap oluştur**
3. **Yeni proje oluştur:**
   - "Create Project" butonuna tıkla
   - Platform olarak **"React Native"** seç
   - Project name: `matchtalk-ios` (veya istediğin isim)
   - Organization seç (veya yeni oluştur)
   - "Create Project" butonuna tıkla

4. **DSN'i kopyala:**
   - Proje oluşturulduktan sonra DSN gösterilecek
   - Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
   - Bu DSN'i kopyala (sonraki adımda kullanacağız)

## 2. Sentry Auth Token Oluşturma

1. **Sentry.io'da:**
   - Sağ üst köşede profil ikonuna tıkla
   - **"User settings"** seç
   - Sol menüden **"Auth Tokens"** seç
   - **"Create New Token"** butonuna tıkla

2. **Token ayarları:**
   - Name: `matchtalk-ios-eas` (veya istediğin isim)
   - Scopes: Şunları seç:
     - ✅ `project:read`
     - ✅ `project:releases`
     - ✅ `org:read`
   - **"Create Token"** butonuna tıkla
   - **Token'ı kopyala** (sadece bir kez gösterilir!)

## 3. Organization ve Project Name'i Bulma

1. **Organization name:**
   - Sentry.io'da sol üst köşede organization adını görürsün
   - Örnek: `your-org-name`

2. **Project name:**
   - Proje oluştururken verdiğin isim
   - Örnek: `matchtalk-ios`

## 4. EAS Secrets Ekleme

Terminal'de şu komutları çalıştır (matchtalk-ios-build klasöründe):

```bash
# SENTRY_DSN ekle
eas secret:create --scope project --name SENTRY_DSN --value "https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"

# SENTRY_AUTH_TOKEN ekle
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "sntrys_xxxxxxxxxxxxxxxxxxxxx"

# SENTRY_ORG ekle
eas secret:create --scope project --name SENTRY_ORG --value "your-org-name"

# SENTRY_PROJECT ekle
eas secret:create --scope project --name SENTRY_PROJECT --value "matchtalk-ios"
```

**Not:** Değerleri kendi Sentry bilgilerinle değiştir!

## 5. Secrets Kontrolü

Eklendiğini kontrol et:

```bash
eas secret:list
```

Şunları görmelisin:
- ✅ SENTRY_DSN
- ✅ SENTRY_AUTH_TOKEN
- ✅ SENTRY_ORG
- ✅ SENTRY_PROJECT

## 6. Build ve Test

Artık production build alabilirsin:

```bash
eas build --platform ios --profile production
```

Build sırasında Sentry source maps otomatik upload edilecek.

## 7. Sentry'de Kontrol

1. **Sentry.io'da projene git**
2. **"Issues"** sekmesine bak
3. **"Releases"** sekmesine bak (source maps kontrolü için)

## Sorun Giderme

### Secret eklenmiyor?
- EAS CLI'nin güncel olduğundan emin ol: `npm install -g eas-cli`
- Login olduğundan emin: `eas login`

### Source maps upload olmuyor?
- `eas.json`'da env variables doğru mu kontrol et
- Build loglarında Sentry hataları var mı kontrol et

### DSN çalışmıyor?
- DSN formatını kontrol et
- Sentry projesinde "Client Keys (DSN)" bölümünden doğru DSN'i kopyaladığından emin ol

## Önemli Notlar

- ✅ DSN production ve development için aynı olabilir (environment ile ayrılır)
- ✅ Auth token'ı güvenli tut (asla commit etme!)
- ✅ Organization ve project name case-sensitive olabilir
- ✅ Source maps sadece production build'de upload edilir
