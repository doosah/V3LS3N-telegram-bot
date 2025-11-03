// Telegram Bot Scheduler для V3LS3N
// Работает на сервере без включенного ПК

import cron from 'node-cron';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Конфигурация
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8241855422:AAG7yW4NT5yoOagAo7My6bXDCdOo-pAhUa8';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003107822060';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hpjrjpxctmlttdwqrpvc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwanJqcHhjdG1sdHRkd3FycHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzAxMzIsImV4cCI6MjA3NzY0NjEzMn0.jgJD4uKiLoW6MPw5yMrsoYlguowcnn5tl9pKeib7tcs';

// Инициализация Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Telegram API
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Список ответственных по складам
const RESPONSIBLE_PERSONS = {
    'МУРМАНСК_ХАБ_ОБЪЕЗДНАЯ': '@ArtemBosyy',
    'АРХАНГЕЛЬСК_ХАБ_НАХИМОВА': '@Aleksandr_Errmin',
    'СЫКТЫВКАР_ХАБ_ОКТЯБРЬСКИЙ': '@Maksim_T_A',
    'СЫКТЫВКАР_ХАБ_ЛЕСОПАРКОВАЯ': '@Maksim_T_A',
    'ПЕТРОЗАВОДСК_ХАБ_ПРЯЖИНСКОЕ': '@PavelDisfeAr',
    'ПСКОВ_ХАБ_НОВЫЙ': '@ManagerPskov',
    'ПСКОВ_ХАБ_МАРГЕЛОВА': '@ManagerPskov',
    'ВЕЛИКИЙ_НОВГОРОД_ХАБ_НЕХИНСКАЯ': '@ANDREY777',
    'ЧЕРЕПОВЕЦ_ХАБ_СТРОЙИНДУСТРИИ': '@mj2354',
    // Остальные склады без назначенных ответственных
};

// Список складов
const WAREHOUSES = [
    "АРХАНГЕЛЬСК_ХАБ_НАХИМОВА",
    "МУРМАНСК_ХАБ_ОБЪЕЗДНАЯ",
    "ВЕЛИКИЙ_НОВГОРОД_ХАБ_НЕХИНСКАЯ",
    "ПЕТРОЗАВОДСК_ХАБ_ПРЯЖИНСКОЕ",
    "ПСКОВ_ХАБ_МАРГЕЛОВА",
    "ПСКОВ_ХАБ_НОВЫЙ",
    "СЫКТЫВКАР_ХАБ_ЛЕСОПАРКОВАЯ",
    "СЫКТЫВКАР_ХАБ_ОКТЯБРЬСКИЙ",
    "ЧЕРЕПОВЕЦ_ХАБ_СТРОЙИНДУСТРИИ",
    "ВОЛОГДА_ХАБ_БЕЛОЗЕРСКОЕ",
    "СПБ_ХАБ_Осиновая Роща",
    "СПБ_Хаб_Парголово",
    "СПБ_Хаб_Парголово_Блок_3",
    "СПБ_Хаб_Парголово_Блок_4"
];

/**
 * Получение текущей даты в формате DD.MM.YYYY
 */
function getCurrentDate() {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const day = String(moscowTime.getDate()).padStart(2, '0');
    const month = String(moscowTime.getMonth() + 1).padStart(2, '0');
    const year = moscowTime.getFullYear();
    return `${day}.${month}.${year}`;
}

/**
 * Получение текущей даты в формате YYYY-MM-DD для Supabase
 */
function getCurrentDateISO() {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    return moscowTime.toISOString().split('T')[0];
}

/**
 * Отправка сообщения в Telegram
 */
async function sendTelegramMessage(text, chatId = TELEGRAM_CHAT_ID) {
    try {
        const response = await fetch(`${BOT_API_URL}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        
        const data = await response.json();
        if (data.ok) {
            console.log('✅ Сообщение отправлено в Telegram');
            return true;
        } else {
            console.error('❌ Ошибка отправки в Telegram:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error);
        return false;
    }
}

/**
 * Отправка файла в Telegram
 */
async function sendTelegramDocument(buffer, filename, caption = '', chatId = TELEGRAM_CHAT_ID) {
    try {
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('document', buffer, { filename });
        formData.append('caption', caption);
        
        const response = await fetch(`${BOT_API_URL}/sendDocument`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.ok) {
            console.log('✅ Файл отправлен в Telegram');
            return true;
        } else {
            console.error('❌ Ошибка отправки файла в Telegram:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка отправки файла в Telegram:', error);
        return false;
    }
}

/**
 * Загрузка отчетов из Supabase
 */
async function loadReportsFromSupabase(date, shiftType) {
    try {
        // Преобразуем дату в формат YYYY-MM-DD для Supabase
        const dateParts = date.split('.');
        const supabaseDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : date;
        
        // Загружаем операционные отчеты
        const { data: operationalData, error: operationalError } = await supabase
            .from('operational_reports')
            .select('*')
            .eq('report_date', supabaseDate)
            .eq('shift_type', shiftType);
        
        if (operationalError) {
            console.error('Ошибка загрузки операционных отчетов:', operationalError);
        }
        
        // Загружаем отчеты по персоналу
        const { data: personnelData, error: personnelError } = await supabase
            .from('personnel_reports')
            .select('*')
            .eq('report_date', supabaseDate)
            .eq('shift_type', shiftType);
        
        if (personnelError) {
            console.error('Ошибка загрузки отчетов по персоналу:', personnelError);
        }
        
        return {
            operational: operationalData || [],
            personnel: personnelData || []
        };
    } catch (error) {
        console.error('Ошибка загрузки отчетов из Supabase:', error);
        return {
            operational: [],
            personnel: []
        };
    }
}

/**
 * Проверка заполненности отчетов
 */
function checkReportsFilled(reports, warehouses, dateISO, shiftType) {
    const filled = {};
    const missing = {};
    
    // dateISO уже в формате YYYY-MM-DD
    const supabaseDate = dateISO;
    
    warehouses.forEach(warehouse => {
        const hasOperational = reports.operational.some(r => 
            r.warehouse === warehouse && r.report_date === supabaseDate && r.shift_type === shiftType
        );
        const hasPersonnel = reports.personnel.some(r => 
            r.warehouse === warehouse && r.report_date === supabaseDate && r.shift_type === shiftType
        );
        
        // Считаем заполненным, если есть хотя бы один отчет
        if (hasOperational || hasPersonnel) {
            filled[warehouse] = true;
        } else {
            missing[warehouse] = true;
        }
    });
    
    return { filled, missing };
}

/**
 * Формирование списка незаполненных складов для тегания
 */
function formatMissingWarehouses(missingWarehouses) {
    if (Object.keys(missingWarehouses).length === 0) {
        return '';
    }
    
    const tags = Object.keys(missingWarehouses)
        .map(warehouse => {
            const username = RESPONSIBLE_PERSONS[warehouse];
            return username ? `${username} (${warehouse})` : warehouse;
        })
        .join(' ');
    
    return tags;
}

/**
 * Отправка напоминания о незаполненных отчетах
 */
async function sendReminder(dateISO, shiftType) {
    const dateDisplay = getCurrentDate(); // Для отображения в сообщении
    console.log(`📅 Проверка отчетов: ${dateDisplay}, смена: ${shiftType}`);
    
    const reports = await loadReportsFromSupabase(dateISO, shiftType);
    const { missing } = checkReportsFilled(reports, WAREHOUSES, dateISO, shiftType);
    
    if (Object.keys(missing).length === 0) {
        console.log('✅ Все отчеты заполнены - напоминание не отправляется');
        return false;
    }
    
    const shiftName = shiftType === 'day' ? 'Дневная' : 'Ночная';
    const tags = formatMissingWarehouses(missing);
    
    const message = `⚠️ <b>Напоминание о незаполненных отчетах</b>\n\n` +
                   `📅 Дата: ${dateDisplay}\n` +
                   `🌓 Смена: ${shiftName}\n\n` +
                   `❌ Не заполнено:\n${tags}\n\n` +
                   `Пожалуйста, заполните отчеты до ${shiftType === 'day' ? '08:00' : '22:00'}`;
    
    return await sendTelegramMessage(message);
}

/**
 * Отправка итогового отчета
 */
async function sendFinalReport(dateISO, shiftType) {
    const dateDisplay = getCurrentDate(); // Для отображения в сообщении
    console.log(`📊 Отправка итогового отчета: ${dateDisplay}, смена: ${shiftType}`);
    
    const reports = await loadReportsFromSupabase(dateISO, shiftType);
    const { missing } = checkReportsFilled(reports, WAREHOUSES, dateISO, shiftType);
    
    const shiftName = shiftType === 'day' ? 'Дневная' : 'Ночная';
    
    let message = `📊 <b>Итоговый отчет</b>\n\n` +
                 `📅 Дата: ${dateDisplay}\n` +
                 `🌓 Смена: ${shiftName}\n\n`;
    
    if (Object.keys(missing).length > 0) {
        const tags = formatMissingWarehouses(missing);
        message += `⚠️ <b>Не заполнено:</b>\n${tags}\n\n`;
    } else {
        message += `✅ Все отчеты заполнены\n\n`;
    }
    
    // Добавить сводные данные
    const operationalCount = reports.operational.length;
    const personnelCount = reports.personnel.length;
    message += `📈 Статистика:\n` +
               `• Операционные отчеты: ${operationalCount}\n` +
               `• Отчеты по персоналу: ${personnelCount}\n` +
               `• Всего складов: ${WAREHOUSES.length}`;
    
    // Здесь можно добавить отправку Excel файла
    // const excelBuffer = await generateExcelReport(reports);
    // await sendTelegramDocument(excelBuffer, `report_${dateDisplay}_${shiftType}.xlsx`, message);
    
    return await sendTelegramMessage(message);
}

/**
 * Тестовая отправка сообщения (для проверки работы)
 */
async function testSendMessage() {
    console.log('🧪 Тестовая отправка сообщения...');
    const testMessage = `🧪 <b>Тестовое сообщение</b>\n\n` +
                       `✅ Планировщик работает!\n` +
                       `📅 Дата: ${getCurrentDate()}\n` +
                       `⏰ Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
                       `Сервер запущен и готов к работе.`;
    
    const result = await sendTelegramMessage(testMessage);
    if (result) {
        console.log('✅ Тестовое сообщение отправлено успешно!');
    } else {
        console.error('❌ Ошибка отправки тестового сообщения');
    }
    return result;
}

/**
 * Планировщик задач
 */
console.log('🚀 Telegram Bot Scheduler запущен');
console.log(`📅 Текущая дата: ${getCurrentDate()}`);
console.log(`⏰ Текущее время (МСК): ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`);
console.log(`💬 Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`🔗 Supabase URL: ${SUPABASE_URL ? '✓ Настроен' : '✗ Не настроен'}`);

// Отправка тестового сообщения при запуске (можно закомментировать после проверки)
// testSendMessage().catch(console.error);

// Дневная смена - напоминание в 07:45
cron.schedule('45 7 * * *', async () => {
    console.log('⏰ Напоминание дневной смены (07:45)');
    const date = getCurrentDateISO();
    await sendReminder(date, 'day');
}, {
    timezone: 'Europe/Moscow'
});

// Дневная смена - итоговый отчет в 08:00
cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Итоговый отчет дневной смены (08:00)');
    const date = getCurrentDateISO();
    await sendFinalReport(date, 'day');
}, {
    timezone: 'Europe/Moscow'
});

// Ночная смена - напоминание в 21:45
cron.schedule('45 21 * * *', async () => {
    console.log('⏰ Напоминание ночной смены (21:45)');
    const date = getCurrentDateISO();
    await sendReminder(date, 'night');
}, {
    timezone: 'Europe/Moscow'
});

// Ночная смена - итоговый отчет в 22:00
cron.schedule('0 22 * * *', async () => {
    console.log('⏰ Итоговый отчет ночной смены (22:00)');
    const date = getCurrentDateISO();
    await sendFinalReport(date, 'night');
}, {
    timezone: 'Europe/Moscow'
});

// Health check endpoint (для облачных платформ)
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            date: getCurrentDate(),
            time: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
            chat_id: TELEGRAM_CHAT_ID,
            supabase_configured: !!SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL'
        }));
    } else if (req.url === '/test' && req.method === 'GET') {
        // Тестовый endpoint для проверки отправки сообщения
        res.writeHead(200, { 'Content-Type': 'application/json' });
        try {
            const result = await testSendMessage();
            res.end(JSON.stringify({ 
                status: result ? 'success' : 'error',
                message: result ? 'Тестовое сообщение отправлено' : 'Ошибка отправки'
            }));
        } catch (error) {
            res.end(JSON.stringify({ 
                status: 'error',
                message: error.message
            }));
        }
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Обработка ошибок
process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанная ошибка:', error);
});

process.on('SIGTERM', () => {
    console.log('⏹️ Получен SIGTERM, завершение работы...');
    server.close(() => {
        process.exit(0);
    });
});

