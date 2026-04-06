# PsiKoç — Türkçe AI Duygusal Destek Asistanı

## Proje Yapısı
```
psikoç/
  backend/   FastAPI + PostgreSQL + Claude API
  frontend/  React Native (Expo)
```

---

## Backend Kurulum

### 1. Ortam değişkenleri
```bash
cd backend
cp .env.example .env
# .env dosyasını düzenle:
#   ANTHROPIC_API_KEY=sk-ant-...
#   DATABASE_URL=postgresql://user:pass@localhost:5432/psikoc
#   JWT_SECRET=gizli_anahtar
```

### 2. Python ortamı ve bağımlılıklar
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. PostgreSQL veritabanı oluştur
```sql
CREATE DATABASE psikoc;
```

### 4. Sunucuyu başlat
```bash
python run.py
# veya
uvicorn app.main:app --reload
```

API dökümantasyonu: http://localhost:8000/docs

---

## Frontend Kurulum

```bash
cd frontend
npm install
npx expo start
```

- Android: `a` tuşuna bas
- iOS Simulator: `i` tuşuna bas
- Web: `w` tuşuna bas

### Backend bağlantısı
`src/services/api.ts` içindeki `BASE_URL`'yi düzenle:
- Emülatör için: `http://10.0.2.2:8000` (Android)
- Gerçek cihaz için: `http://192.168.x.x:8000` (yerel IP)

---

## API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register` | Kayıt |
| POST | `/api/auth/login` | Giriş |
| POST | `/api/chat` | Mesaj gönder |
| GET | `/api/chat/conversations` | Konuşma listesi |
| GET | `/api/chat/conversations/{id}` | Konuşma detayı |
| DELETE | `/api/chat/conversations/{id}` | Konuşma sil |
