# Telegram Bot Scheduler для V3LS3N

Серверный планировщик для автоматической отправки отчетов в Telegram.

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Заполните `.env`:
- `TELEGRAM_BOT_TOKEN` - токен бота (уже заполнен)
- `TELEGRAM_CHAT_ID` - ID чата для отправки
- `SUPABASE_URL` - URL вашего Supabase проекта
- `SUPABASE_KEY` - ключ Supabase (anon key)

4. Заполните список ответственных в `index.js`:
```javascript
const RESPONSIBLE_PERSONS = {
    'АРХАНГЕЛЬСК_ХАБ_НАХИМОВА': '@username1',
    // ... и т.д.
};
```

## Запуск локально

```bash
npm start
```

## Деплой на облачный хостинг

### Вариант 1: Railway (рекомендуется)

1. Зарегистрируйтесь на https://railway.app
2. Создайте новый проект
3. Подключите GitHub репозиторий
4. Добавьте переменные окружения в настройках проекта:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
5. Railway автоматически запустит сервер

### Вариант 2: Render.com

1. Зарегистрируйтесь на https://render.com
2. Создайте новый Web Service
3. Подключите GitHub репозиторий
4. Укажите:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Добавьте переменные окружения
6. Render автоматически запустит сервер

### Вариант 3: Vercel (Serverless Functions)

Создайте `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
```

### Вариант 4: GitHub Actions (Cron)

Создайте `.github/workflows/scheduler.yml`:
```yaml
name: Telegram Scheduler

on:
  schedule:
    - cron: '45 7 * * *'  # 07:45 UTC = 10:45 MSK
    - cron: '0 8 * * *'   # 08:00 UTC = 11:00 MSK
    - cron: '45 21 * * *' # 21:45 UTC = 00:45 MSK (следующий день)
    - cron: '0 22 * * *'  # 22:00 UTC = 01:00 MSK (следующий день)
  workflow_dispatch:

jobs:
  send-reports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node index.js
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

## Расписание

- **Дневная смена:**
  - 07:45 МСК - Напоминание о незаполненных отчетах
  - 08:00 МСК - Финальный отчет

- **Ночная смена:**
  - 21:45 МСК - Напоминание о незаполненных отчетах
  - 22:00 МСК - Финальный отчет

## Health Check

Сервер предоставляет health check endpoint:
- `GET /health` - проверка статуса сервера
- `GET /` - тоже health check

## Примечания

- Сервер работает 24/7 на облачном хостинге
- Время указано по московскому времени (Europe/Moscow)
- Если все отчеты заполнены до 07:45/21:45, напоминание не отправляется

