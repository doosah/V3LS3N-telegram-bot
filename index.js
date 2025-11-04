// Telegram Bot Scheduler для V3LS3N
// Работает на сервере без включенного ПК

import cron from 'node-cron';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import { generateTableHTML, htmlToImage } from './table-generator.js';

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
 * Отправка изображения в Telegram
 */
async function sendTelegramPhoto(buffer, caption = '', chatId = TELEGRAM_CHAT_ID) {
    try {
        console.log(`📤 Отправка изображения (${buffer.length} байт) в Telegram...`);
        console.log(`📤 Chat ID: ${chatId}`);
        console.log(`📤 BOT API URL: ${BOT_API_URL}`);
        
        // Используем axios для надежной отправки
        try {
            const axiosModule = await import('axios');
            const axios = axiosModule.default;
            
            const FormDataModule = await import('form-data');
            const FormData = FormDataModule.default;
            
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', buffer, {
                filename: 'table.png',
                contentType: 'image/png'
            });
            if (caption) {
                formData.append('caption', caption);
                formData.append('parse_mode', 'HTML');
            }
            
            console.log('📤 Отправка через axios...');
            const response = await axios.post(`${BOT_API_URL}/sendPhoto`, formData, {
                headers: formData.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 60000
            });
            
            console.log('📤 Response status:', response.status);
            console.log('📤 Response data:', JSON.stringify(response.data, null, 2));
            
            if (response.data && response.data.ok) {
                console.log('✅ Изображение отправлено в Telegram (через axios)');
                return true;
            } else {
                throw new Error(`Telegram API error: ${response.data?.description || 'Unknown error'}`);
            }
        } catch (axiosError) {
            console.error('❌ Ошибка при использовании axios:', axiosError.message);
            if (axiosError.response) {
                console.error('❌ Response status:', axiosError.response.status);
                console.error('❌ Response data:', JSON.stringify(axiosError.response.data, null, 2));
            }
            console.error('Stack:', axiosError.stack);
            
            // Fallback на старый метод через https
            console.log('⚠️ Пробуем fallback через https...');
            return await sendTelegramPhotoHttps(buffer, caption, chatId);
        }
    } catch (error) {
        console.error('❌ Ошибка отправки изображения в Telegram:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

/**
 * Альтернативный метод отправки через https (fallback)
 */
async function sendTelegramPhotoHttps(buffer, caption = '', chatId = TELEGRAM_CHAT_ID) {
    const FormDataModule = await import('form-data');
    const FormData = FormDataModule.default;
    const httpsModule = await import('https');
    const https = httpsModule.default || httpsModule;
    
    const formData = new FormData();
    
    formData.append('chat_id', chatId);
    formData.append('photo', buffer, {
        filename: 'table.png',
        contentType: 'image/png'
    });
    if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
    }
    
    const url = new URL(`${BOT_API_URL}/sendPhoto`);
    
    return new Promise((resolve, reject) => {
        const formHeaders = formData.getHeaders();
        console.log('📤 Form headers:', Object.keys(formHeaders));
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: formHeaders
        };
        
        console.log('📤 Sending request to:', url.hostname + url.pathname);
        
        const req = https.default ? https.default.request(options, handleResponse) : https.request(options, handleResponse);
        
        function handleResponse(res) {
            console.log(`📤 Response status: ${res.statusCode}`);
            
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                console.log(`📤 Response body length: ${responseData.length} bytes`);
                try {
                    const data = JSON.parse(responseData);
                    console.log('📤 Response data:', JSON.stringify(data, null, 2));
                    
                    if (data.ok) {
                        console.log('✅ Изображение отправлено в Telegram (через https)');
                        resolve(true);
                    } else {
                        console.error('❌ Ошибка отправки изображения:', JSON.stringify(data, null, 2));
                        reject(new Error(`Telegram API error: ${data.description || 'Unknown error'}`));
                    }
                } catch (parseError) {
                    console.error('❌ Ошибка парсинга ответа:', parseError.message);
                    console.error('Response body (first 500 chars):', responseData.substring(0, 500));
                    reject(new Error(`Parse error: ${parseError.message}`));
                }
            });
        }
        
        req.on('error', (error) => {
            console.error('❌ Ошибка запроса:', error.message);
            reject(error);
        });
        
        formData.pipe(req);
        
        formData.on('error', (error) => {
            console.error('❌ Ошибка form-data:', error.message);
            req.destroy();
            reject(error);
        });
        
        req.setTimeout(60000, () => {
            console.error('❌ Таймаут запроса');
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
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
        const operationalReport = reports.operational.find(r => 
            r.warehouse === warehouse && r.report_date === supabaseDate && r.shift_type === shiftType
        );
        
        // Проверяем, есть ли данные в операционном отчёте
        // Считаем заполненным, если есть отчёт И в нём есть данные (не пустой объект)
        if (operationalReport && operationalReport.data) {
            const data = operationalReport.data;
            // Проверяем, есть ли хотя бы одно поле с реальными данными (не null, не undefined, не пустая строка)
            const hasData = Object.keys(data).length > 0 && 
                           Object.values(data).some(val => {
                               if (val === null || val === undefined || val === '') return false;
                               if (typeof val === 'object' && Object.keys(val).length === 0) return false;
                               if (typeof val === 'object') {
                                   // Для вложенных объектов проверяем наличие значений
                                   return Object.values(val).some(v => v !== null && v !== undefined && v !== '');
                               }
                               return true;
                           });
            
            if (hasData) {
                filled[warehouse] = true;
            } else {
                missing[warehouse] = true;
            }
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
 * Отправка итогового отчета с изображением таблицы
 */
async function sendFinalReport(dateISO, shiftType) {
    const dateDisplay = getCurrentDate(); // Для отображения в сообщении
    console.log(`📊 Отправка итогового отчета: ${dateDisplay}, смена: ${shiftType}`);
    
    const reports = await loadReportsFromSupabase(dateISO, shiftType);
    console.log(`📊 Загружено из Supabase: ${reports.operational.length} операционных, ${reports.personnel.length} персонала`);
    
    const shiftName = shiftType === 'day' ? 'Дневная' : 'Ночная';
    
    // Формируем простую подпись для изображения
    const caption = `📊 <b>Сводная таблица</b>\n📅 Дата: ${dateDisplay}\n🌓 Смена: ${shiftName}`;
    
    try {
        // Преобразуем данные для таблицы
        console.log('📊 Преобразование данных для таблицы...');
        const transformedReports = transformSupabaseDataForTable(reports.operational, reports.personnel, dateISO, shiftType);
        console.log(`📊 Преобразованные данные: ${JSON.stringify(Object.keys(transformedReports))}`);
        
        // Генерируем HTML таблицы
        console.log('📊 Генерация HTML таблицы...');
        const html = generateTableHTML(transformedReports, dateISO, shiftType);
        console.log(`✅ HTML сгенерирован, длина: ${html.length} символов`);
        
        // Даже если данных нет, генерируем изображение с пустой таблицей
        // Таблица будет показывать все склады с пустыми значениями
        
        // Конвертируем в изображение
        console.log('🖼️ Конвертация HTML в изображение через Puppeteer...');
        let imageBuffer;
        try {
            imageBuffer = await htmlToImage(html);
            
            if (!imageBuffer || imageBuffer.length === 0) {
                throw new Error('Изображение не сгенерировано (пустой буфер)');
            }
            
            console.log(`✅ Изображение сгенерировано успешно, размер: ${imageBuffer.length} байт (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
        } catch (puppeteerError) {
            console.error('❌ Ошибка Puppeteer при генерации изображения:', puppeteerError.message);
            console.error('Stack:', puppeteerError.stack);
            throw new Error(`Не удалось сгенерировать изображение: ${puppeteerError.message}`);
        }
        
        // Отправляем изображение
        console.log('📤 Отправка изображения в Telegram...');
        try {
            const photoResult = await sendTelegramPhoto(imageBuffer, caption);
            
            if (photoResult) {
                console.log('✅ Итоговый отчёт успешно отправлен в Telegram');
                return true;
            } else {
                throw new Error('sendTelegramPhoto вернул false');
            }
        } catch (photoError) {
            console.error('❌ Ошибка отправки изображения:', photoError.message);
            console.error('❌ Stack:', photoError.stack);
            console.error('❌ Image buffer size:', imageBuffer ? imageBuffer.length : 'null');
            // Если не удалось отправить изображение, отправляем текстовое сообщение
            console.log('⚠️ Не удалось отправить изображение в Telegram, отправляю текстовое сообщение...');
            const errorMessage = `⚠️ <i>Не удалось отправить изображение таблицы</i>\n\n<i>Ошибка: ${photoError.message}</i>`;
            await sendTelegramMessage(caption + '\n\n' + errorMessage);
            return false;
        }
    } catch (error) {
        console.error('❌ Критическая ошибка генерации/отправки отчёта:', error.message);
        console.error('Stack:', error.stack);
        // Отправляем текстовое сообщение в случае ошибки
        console.log('📤 Отправка текстового сообщения об ошибке...');
        return await sendTelegramMessage(
            caption + 
            '\n\n❌ <b>Ошибка генерации изображения</b>\n' +
            `<i>${error.message}</i>\n\n` +
            'Проверьте логи на сервере для подробностей.'
        );
    }
}

/**
 * Преобразование данных Supabase для таблицы
 */
function transformSupabaseDataForTable(operationalReports, personnelReports, dateISO, shiftType) {
    const reports = {};
    const dateKey = dateISO.split('-').reverse().join('.');
    
    console.log(`📊 Преобразование данных: дата ${dateISO} (${dateKey}), смена ${shiftType}`);
    console.log(`📊 Операционных отчетов: ${operationalReports.length}`);
    console.log(`📊 Отчетов персонала: ${personnelReports.length}`);
    
    if (!reports[dateKey]) reports[dateKey] = {};
    
    // Обрабатываем операционные отчеты
    operationalReports.forEach(report => {
        console.log(`📊 Обработка операционного отчета:`, {
            report_date: report.report_date,
            shift_type: report.shift_type,
            warehouse: report.warehouse,
            hasData: !!report.data
        });
        
        if (report.report_date === dateISO && report.shift_type === shiftType) {
            const warehouse = report.warehouse;
            const shift = report.shift_type;
            
            if (!reports[dateKey][warehouse]) reports[dateKey][warehouse] = {};
            
            // report.data может быть объектом или строкой JSON
            let reportData = {};
            if (report.data) {
                if (typeof report.data === 'string') {
                    try {
                        reportData = JSON.parse(report.data);
                    } catch (e) {
                        console.error('❌ Ошибка парсинга JSON данных:', e);
                        reportData = {};
                    }
                } else if (typeof report.data === 'object') {
                    reportData = report.data;
                }
            }
            
            reports[dateKey][warehouse][shift] = reportData;
            console.log(`✅ Добавлен отчет для ${warehouse}, категорий: ${Object.keys(reportData).length}`);
        }
    });
    
    console.log(`📊 Итоговая структура:`, Object.keys(reports[dateKey] || {}));
    
    return reports;
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
    // Логируем все запросы для отладки
    const urlPath = req.url.split('?')[0]; // Убираем query параметры для проверки
    console.log(`📥 ${req.method} ${req.url} -> ${urlPath}`);
    
    if (urlPath === '/health' || urlPath === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            date: getCurrentDate(),
            time: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
            chat_id: TELEGRAM_CHAT_ID,
            supabase_configured: !!SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL'
        }));
    } else if (urlPath === '/test' && req.method === 'GET') {
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
    } else if (urlPath === '/send-report' && req.method === 'GET') {
        // Ручная отправка отчёта
        res.writeHead(200, { 'Content-Type': 'application/json' });
        try {
            // Парсим параметры: ?shift=day|night (по умолчанию определяем по времени)
            const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            let shiftType = urlObj.searchParams.get('shift');
            
            // Если не указана смена, определяем по текущему времени
            if (!shiftType) {
                const now = new Date();
                const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
                const hour = moscowTime.getHours();
                // Дневная смена: 6:00 - 18:00, Ночная: 18:00 - 6:00
                shiftType = (hour >= 6 && hour < 18) ? 'day' : 'night';
            }
            
            const dateISO = getCurrentDateISO();
            console.log(`📊 Ручная отправка отчёта: ${getCurrentDate()}, смена: ${shiftType}`);
            
            const result = await sendFinalReport(dateISO, shiftType);
            
            res.end(JSON.stringify({ 
                status: result ? 'success' : 'error',
                message: result ? `Отчёт отправлен (${shiftType === 'day' ? 'Дневная' : 'Ночная'} смена)` : 'Ошибка отправки',
                date: getCurrentDate(),
                shift: shiftType
            }));
        } catch (error) {
            res.end(JSON.stringify({ 
                status: 'error',
                message: error.message
            }));
        }
    } else if (urlPath === '/test-image' && req.method === 'GET') {
        // Тестовый endpoint для проверки генерации изображения
        res.writeHead(200, { 'Content-Type': 'application/json' });
        try {
            const dateISO = getCurrentDateISO();
            const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            let shiftType = urlObj.searchParams.get('shift') || 'day';
            
            console.log(`🧪 Тест генерации изображения: ${getCurrentDate()}, смена: ${shiftType}`);
            
            // Загружаем данные
            const reports = await loadReportsFromSupabase(dateISO, shiftType);
            console.log(`📊 Загружено: ${reports.operational.length} операционных, ${reports.personnel.length} персонала`);
            
            // Преобразуем данные
            const transformedReports = transformSupabaseDataForTable(reports.operational, reports.personnel, dateISO, shiftType);
            console.log(`📊 Преобразовано: ${JSON.stringify(Object.keys(transformedReports))}`);
            
            // Генерируем HTML
            const html = generateTableHTML(transformedReports, dateISO, shiftType);
            console.log(`📊 HTML длина: ${html.length} символов`);
            
            // Генерируем изображение
            console.log('🖼️ Генерация изображения...');
            const imageBuffer = await htmlToImage(html);
            
            if (!imageBuffer || imageBuffer.length === 0) {
                throw new Error('Изображение пустое');
            }
            
            console.log(`✅ Изображение создано: ${imageBuffer.length} байт`);
            
            // Отправляем изображение в ответ (base64 для теста)
            const base64Image = imageBuffer.toString('base64');
            
            res.end(JSON.stringify({ 
                status: 'success',
                message: 'Изображение сгенерировано успешно',
                imageSize: imageBuffer.length,
                htmlLength: html.length,
                reportsCount: reports.operational.length,
                dataKeys: Object.keys(transformedReports),
                imageBase64: base64Image.substring(0, 100) + '...' // Первые 100 символов для проверки
            }));
        } catch (error) {
            console.error('❌ Ошибка теста:', error);
            res.end(JSON.stringify({ 
                status: 'error',
                message: error.message,
                stack: error.stack
            }));
        }
    } else {
        console.log(`❌ 404: ${req.method} ${req.url}`);
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Test Telegram: http://localhost:${PORT}/test`);
    console.log(`🔗 Manual Report: http://localhost:${PORT}/send-report`);
    console.log(`🔗 Test Image: http://localhost:${PORT}/test-image`);
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

