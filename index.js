// Telegram Bot Scheduler для V3LS3N
// Работает на сервере без включенного ПК

import cron from 'node-cron';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import { generateTableHTML, generateOperationalTableHTML, generatePersonnelTableHTML, htmlToImage } from './table-generator.js';

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
export function getCurrentDateISO() {
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
 * ПОЛНОСТЬЮ НОВЫЙ ПОДХОД - используем sendDocument вместо sendPhoto
 * и формируем multipart/form-data вручную через Buffer
 */
async function sendTelegramPhoto(buffer, caption = '', chatId = TELEGRAM_CHAT_ID) {
    try {
        console.log(`📤 Отправка изображения (${buffer.length} байт) в Telegram...`);
        console.log(`📤 Chat ID: ${chatId}`);
        console.log(`📤 BOT API URL: ${BOT_API_URL}`);
        
        // КАРДИНАЛЬНО НОВЫЙ ПОДХОД: используем sendDocument вместо sendPhoto
        // Это более надежный способ для больших файлов
        const FormDataModule = await import('form-data');
        const FormData = FormDataModule.default;
        const httpsModule = await import('https');
        const https = httpsModule.default || httpsModule;
        
        const formData = new FormData();
        
        // Отправляем как документ с превью - это работает надежнее
        formData.append('chat_id', chatId);
        formData.append('document', buffer, {
            filename: 'table.png',
            contentType: 'image/png'
        });
        formData.append('thumb', buffer); // Превью для отображения как фото
        if (caption) {
            formData.append('caption', caption);
            formData.append('parse_mode', 'HTML');
        }
        
        const url = new URL(`${BOT_API_URL}/sendDocument`);
        
        return new Promise((resolve, reject) => {
            const formHeaders = formData.getHeaders();
            console.log('📤 Отправка через sendDocument (новый подход)...');
            console.log('📤 Form headers:', Object.keys(formHeaders));
            
            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'POST',
                headers: formHeaders
            };
            
            const req = https.request(options, (res) => {
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
                            console.log('✅ Изображение отправлено в Telegram как документ');
                            resolve(true);
                        } else {
                            console.error('❌ Ошибка отправки документа:', JSON.stringify(data, null, 2));
                            // Если sendDocument не сработал, пробуем sendPhoto как fallback
                            console.log('⚠️ Пробуем sendPhoto как fallback...');
                            sendTelegramPhotoFallback(buffer, caption, chatId)
                                .then(resolve)
                                .catch(reject);
                        }
                    } catch (parseError) {
                        console.error('❌ Ошибка парсинга ответа:', parseError.message);
                        console.error('Response body:', responseData.substring(0, 500));
                        reject(new Error(`Parse error: ${parseError.message}`));
                    }
                });
            });
            
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
    } catch (error) {
        console.error('❌ Ошибка отправки изображения:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

/**
 * Fallback: отправка через sendPhoto (если sendDocument не сработал)
 */
async function sendTelegramPhotoFallback(buffer, caption = '', chatId = TELEGRAM_CHAT_ID) {
    const FormDataModule = await import('form-data');
    const FormData = FormDataModule.default;
    const httpsModule = await import('https');
    const https = httpsModule.default || httpsModule;
    
    return new Promise((resolve, reject) => {
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
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: formData.getHeaders()
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                try {
                    const data = JSON.parse(responseData);
                    if (data.ok) {
                        console.log('✅ Изображение отправлено через sendPhoto (fallback)');
                        resolve(true);
                    } else {
                        reject(new Error(`Telegram API error: ${data.description || 'Unknown error'}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });
        
        req.on('error', reject);
        formData.pipe(req);
        req.setTimeout(60000, () => {
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
        // Если дата уже в формате YYYY-MM-DD, используем как есть
        let supabaseDate = date;
        if (date.includes('.')) {
            // Если дата в формате DD.MM.YYYY, преобразуем
            const dateParts = date.split('.');
            if (dateParts.length === 3) {
                supabaseDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            }
        }
        
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
 * Проверка наличия данных в отчете
 */
function hasReportDataInReport(reportData) {
    if (!reportData) return false;
    
    // Парсим данные, если они в виде строки
    let data = reportData;
    if (typeof reportData === 'string') {
        try {
            data = JSON.parse(reportData);
        } catch (e) {
            return false;
        }
    }
    
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return false;
    }
    
    // Проверяем, есть ли хотя бы одно поле с реальными данными
    return Object.values(data).some(val => {
        if (val === null || val === undefined || val === '') return false;
        if (typeof val === 'object' && Object.keys(val).length === 0) return false;
        if (typeof val === 'object') {
            // Для вложенных объектов проверяем наличие значений
            return Object.values(val).some(v => v !== null && v !== undefined && v !== '');
        }
        return true;
    });
}

/**
 * Проверка заполненности отчетов по типам отдельно
 * Возвращает объект с незаполненными складами для каждого типа отчета
 */
function checkReportsFilledByType(reports, warehouses, dateISO, shiftType) {
    const operationalMissing = {};
    const personnelMissing = {};
    
    const supabaseDate = dateISO;
    
    warehouses.forEach(warehouse => {
        // Проверяем операционные отчеты
        const operationalReport = reports.operational.find(r => 
            r.warehouse === warehouse && r.report_date === supabaseDate && r.shift_type === shiftType
        );
        
        const hasOperationalData = hasReportDataInReport(operationalReport?.data);
        
        // Проверяем, полностью ли заполнен операционный отчет
        if (!hasOperationalData || !isReportFullyFilled(operationalReport?.data)) {
            operationalMissing[warehouse] = true;
        }
        
        // Проверяем отчеты по персоналу
        const personnelReport = reports.personnel.find(r => 
            r.warehouse === warehouse && r.report_date === supabaseDate && r.shift_type === shiftType
        );
        
        const hasPersonnelData = hasReportDataInReport(personnelReport?.data);
        
        // Проверяем, полностью ли заполнен отчет по персоналу
        if (!hasPersonnelData || !isReportFullyFilled(personnelReport?.data)) {
            personnelMissing[warehouse] = true;
        }
    });
    
    return { operationalMissing, personnelMissing };
}

/**
 * Проверка, что отчет полностью заполнен (нет пустых значений)
 * Проверяет, что все категории заполнены и нет пустых полей
 */
function isReportFullyFilled(reportData) {
    if (!reportData) return false;
    
    // Парсим данные, если они в виде строки
    let data = reportData;
    if (typeof reportData === 'string') {
        try {
            data = JSON.parse(reportData);
        } catch (e) {
            return false;
        }
    }
    
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return false;
    }
    
    // Проверяем каждое поле категории
    for (const [categoryName, categoryData] of Object.entries(data)) {
        if (!categoryData || typeof categoryData !== 'object') {
            return false;
        }
        
        // Проверяем поля категории
        for (const [fieldName, fieldValue] of Object.entries(categoryData)) {
            // Пустые строки, null, undefined считаются незаполненными
            // Но 0 (ноль) считается заполненным значением
            if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                return false;
            }
            
            // Для вложенных объектов проверяем все поля
            if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
                for (const [subFieldName, subFieldValue] of Object.entries(fieldValue)) {
                    if (subFieldValue === null || subFieldValue === undefined || subFieldValue === '') {
                        return false;
                    }
                }
            }
        }
    }
    
    return true;
}

/**
 * Проверка заполненности отчетов
 * Учитывает оба типа отчетов: операционные и персонал
 */
function checkReportsFilled(reports, warehouses, dateISO, shiftType) {
    const filled = {};
    const missing = {};
    
    // dateISO уже в формате YYYY-MM-DD
    const supabaseDate = dateISO;
    
    warehouses.forEach(warehouse => {
        // Проверяем операционные отчеты
        const operationalReport = reports.operational.find(r => 
            r.warehouse === warehouse && r.report_date === supabaseDate && r.shift_type === shiftType
        );
        
        // Проверяем отчеты по персоналу
        const personnelReport = reports.personnel.find(r => 
            r.warehouse === warehouse && r.report_date === supabaseDate && r.shift_type === shiftType
        );
        
        // Считаем заполненным, если есть хотя бы один отчет (операционный ИЛИ персонал) с данными
        const hasOperationalData = hasReportDataInReport(operationalReport?.data);
        const hasPersonnelData = hasReportDataInReport(personnelReport?.data);
        
        if (hasOperationalData || hasPersonnelData) {
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
 * Отправляет два отдельных сообщения: для операционных отчетов и для отчетов по персоналу
 */
export async function sendReminder(dateISO, shiftType) {
    const dateDisplay = getCurrentDate(); // Для отображения в сообщении
    console.log(`📅 Проверка отчетов: ${dateDisplay}, смена: ${shiftType}`);
    
    const reports = await loadReportsFromSupabase(dateISO, shiftType);
    const { operationalMissing, personnelMissing } = checkReportsFilledByType(reports, WAREHOUSES, dateISO, shiftType);
    
    let sent = false;
    
    // Отправляем напоминание для отчетов по персоналу
    if (Object.keys(personnelMissing).length > 0) {
        const personnelTags = formatMissingWarehouses(personnelMissing);
        const personnelMessage = `Отчет по Персоналу\n\n` +
                               `❌ Не заполнено:\n\n` +
                               `${personnelTags}\n\n` +
                               `Заполните в течении 15-ти минут`;
        
        await sendTelegramMessage(personnelMessage);
        sent = true;
        console.log(`📤 Отправлено напоминание по персоналу для ${Object.keys(personnelMissing).length} складов`);
    }
    
    // Небольшая задержка между сообщениями
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Отправляем напоминание для операционных отчетов
    if (Object.keys(operationalMissing).length > 0) {
        const operationalTags = formatMissingWarehouses(operationalMissing);
        const operationalMessage = `Отчет Операционные Показатели\n\n` +
                                  `❌ Не заполнено:\n\n` +
                                  `${operationalTags}\n\n` +
                                  `Заполнить в течении 15-ти минут`;
        
        await sendTelegramMessage(operationalMessage);
        sent = true;
        console.log(`📤 Отправлено напоминание по операционным для ${Object.keys(operationalMissing).length} складов`);
    }
    
    if (!sent) {
        console.log('✅ Все отчеты заполнены - напоминание не отправляется');
    }
    
    return sent;
}

/**
 * Проверка наличия данных в отчетах
 */
function hasReportData(reports, dateISO, shiftType) {
    const dateKey = dateISO.split('-').reverse().join('.');
    const reportsData = reports[dateKey] || {};
    
    // Проверяем, есть ли хотя бы один склад с данными
    for (const warehouse of WAREHOUSES) {
        const whData = reportsData[warehouse];
        if (whData && whData[shiftType]) {
            const shiftData = whData[shiftType];
            // Проверяем, есть ли хотя бы одно поле с данными
            if (Object.keys(shiftData).length > 0) {
                const hasData = Object.values(shiftData).some(val => {
                    if (val === null || val === undefined || val === '') return false;
                    if (typeof val === 'object' && Object.keys(val).length === 0) return false;
                    if (typeof val === 'object') {
                        return Object.values(val).some(v => v !== null && v !== undefined && v !== '');
                    }
                    return true;
                });
                if (hasData) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Отправка итогового отчета с изображением таблицы
 */
export async function sendFinalReport(dateISO, shiftType) {
    // Форматируем дату для отображения (из YYYY-MM-DD в DD.MM.YYYY)
    const dateParts = dateISO.split('-');
    const dateDisplay = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : dateISO;
    console.log(`📊 Отправка итогового отчета: ${dateDisplay}, смена: ${shiftType}`);
    
    const reports = await loadReportsFromSupabase(dateISO, shiftType);
    console.log(`📊 Загружено из Supabase: ${reports.operational.length} операционных, ${reports.personnel.length} персонала`);
    
    const shiftName = shiftType === 'day' ? 'Дневная' : 'Ночная';
    
    // Преобразуем данные для каждого типа отчета отдельно
    console.log('📊 Преобразование операционных данных...');
    const operationalReportsTransformed = transformOperationalDataForTable(reports.operational, dateISO, shiftType);
    console.log(`📊 Операционные данные преобразованы: ${JSON.stringify(Object.keys(operationalReportsTransformed))}`);
    
    console.log('📊 Преобразование данных по персоналу...');
    const personnelReportsTransformed = transformPersonnelDataForTable(reports.personnel, dateISO, shiftType);
    console.log(`📊 Данные по персоналу преобразованы: ${JSON.stringify(Object.keys(personnelReportsTransformed))}`);
    
    // Формируем простые подписи для изображений (только название, дата, смена)
    const operationalCaption = `📊 Операционные отчеты\n📅 Дата: ${dateDisplay}\n🌓 Смена: ${shiftName}`;
    const personnelCaption = `👥 Отчеты по персоналу\n📅 Дата: ${dateDisplay}\n🌓 Смена: ${shiftName}`;
    
    // Отправляем две отдельные картинки: операционные отчеты и отчеты по персоналу
    try {
        let operationalSent = false;
        let personnelSent = false;
        
        // 1. Отправляем операционные отчеты (всегда, даже если пустые)
        console.log('📊 Генерация HTML таблицы для операционных отчетов...');
        const operationalHTML = generateOperationalTableHTML(operationalReportsTransformed, dateISO, shiftType);
        console.log(`✅ HTML для операционных отчетов сгенерирован, длина: ${operationalHTML.length} символов`);
        
        console.log('🖼️ Конвертация операционных отчетов в изображение...');
        try {
            const operationalImageBuffer = await htmlToImage(operationalHTML);
            
            if (operationalImageBuffer && operationalImageBuffer.length > 0) {
                console.log(`✅ Изображение операционных отчетов сгенерировано, размер: ${operationalImageBuffer.length} байт`);
                
                const operationalResult = await sendTelegramPhoto(operationalImageBuffer, operationalCaption);
                
                if (operationalResult) {
                    console.log('✅ Операционные отчеты успешно отправлены в Telegram');
                    operationalSent = true;
                } else {
                    console.error('❌ Ошибка отправки операционных отчетов');
                }
            } else {
                throw new Error('Пустой буфер изображения для операционных отчетов');
            }
        } catch (operationalError) {
            console.error('❌ Ошибка генерации/отправки операционных отчетов:', operationalError.message);
            console.error('Stack:', operationalError.stack);
        }
        
        // Небольшая задержка между отправками
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 2. Отправляем отчеты по персоналу (всегда, даже если пустые)
        console.log('📊 Генерация HTML таблицы для отчетов по персоналу...');
        const personnelHTML = generatePersonnelTableHTML(personnelReportsTransformed, dateISO, shiftType);
        console.log(`✅ HTML для отчетов по персоналу сгенерирован, длина: ${personnelHTML.length} символов`);
        
        console.log('🖼️ Конвертация отчетов по персоналу в изображение...');
        try {
            const personnelImageBuffer = await htmlToImage(personnelHTML);
            
            if (personnelImageBuffer && personnelImageBuffer.length > 0) {
                console.log(`✅ Изображение отчетов по персоналу сгенерировано, размер: ${personnelImageBuffer.length} байт`);
                
                const personnelResult = await sendTelegramPhoto(personnelImageBuffer, personnelCaption);
                
                if (personnelResult) {
                    console.log('✅ Отчеты по персоналу успешно отправлены в Telegram');
                    personnelSent = true;
                } else {
                    console.error('❌ Ошибка отправки отчетов по персоналу');
                }
            } else {
                throw new Error('Пустой буфер изображения для отчетов по персоналу');
            }
        } catch (personnelError) {
            console.error('❌ Ошибка генерации/отправки отчетов по персоналу:', personnelError.message);
            console.error('Stack:', personnelError.stack);
        }
        
        if (operationalSent || personnelSent) {
            console.log('✅ Итоговые отчёты успешно отправлены в Telegram');
            return true;
        } else {
            throw new Error('Не удалось отправить ни один из отчетов');
        }
    } catch (error) {
        console.error('❌ Критическая ошибка генерации/отправки отчёта:', error.message);
        console.error('Stack:', error.stack);
        // Отправляем текстовое сообщение в случае ошибки
        console.log('📤 Отправка текстового сообщения об ошибке...');
        return await sendTelegramMessage(
            `📊 <b>Ошибка генерации изображения</b>\n` +
            `📅 Дата: ${dateDisplay}\n` +
            `🌓 Смена: ${shiftName}\n\n` +
            `<i>${error.message}</i>\n\n` +
            'Проверьте логи на сервере для подробностей.'
        );
    }
}

/**
 * Преобразование данных для операционных отчетов
 */
function transformOperationalDataForTable(operationalReports, dateISO, shiftType) {
    const reports = {};
    const dateKey = dateISO.split('-').reverse().join('.');
    
    if (!reports[dateKey]) reports[dateKey] = {};
    
    function parseReportData(data) {
        if (!data) return {};
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('❌ Ошибка парсинга JSON данных:', e);
                return {};
            }
        } else if (typeof data === 'object') {
            return data;
        }
        return {};
    }
    
    operationalReports.forEach(report => {
        if (report.report_date === dateISO && report.shift_type === shiftType) {
            const warehouse = report.warehouse;
            const shift = report.shift_type;
            
            if (!reports[dateKey][warehouse]) reports[dateKey][warehouse] = {};
            if (!reports[dateKey][warehouse][shift]) reports[dateKey][warehouse][shift] = {};
            
            const reportData = parseReportData(report.data);
            reports[dateKey][warehouse][shift] = reportData;
        }
    });
    
    return reports;
}

/**
 * Преобразование данных для отчетов по персоналу
 */
function transformPersonnelDataForTable(personnelReports, dateISO, shiftType) {
    const reports = {};
    const dateKey = dateISO.split('-').reverse().join('.');
    
    if (!reports[dateKey]) reports[dateKey] = {};
    
    function parseReportData(data) {
        if (!data) return {};
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('❌ Ошибка парсинга JSON данных:', e);
                return {};
            }
        } else if (typeof data === 'object') {
            return data;
        }
        return {};
    }
    
    personnelReports.forEach(report => {
        if (report.report_date === dateISO && report.shift_type === shiftType) {
            const warehouse = report.warehouse;
            const shift = report.shift_type;
            
            if (!reports[dateKey][warehouse]) reports[dateKey][warehouse] = {};
            if (!reports[dateKey][warehouse][shift]) reports[dateKey][warehouse][shift] = {};
            
            const reportData = parseReportData(report.data);
            reports[dateKey][warehouse][shift] = reportData;
        }
    });
    
    return reports;
}

/**
 * Преобразование данных Supabase для таблицы
 * Объединяет данные из операционных отчетов и отчетов по персоналу
 */
function transformSupabaseDataForTable(operationalReports, personnelReports, dateISO, shiftType) {
    const reports = {};
    const dateKey = dateISO.split('-').reverse().join('.');
    
    console.log(`📊 Преобразование данных: дата ${dateISO} (${dateKey}), смена ${shiftType}`);
    console.log(`📊 Операционных отчетов: ${operationalReports.length}`);
    console.log(`📊 Отчетов персонала: ${personnelReports.length}`);
    
    if (!reports[dateKey]) reports[dateKey] = {};
    
    // Функция для парсинга данных из отчета
    function parseReportData(data) {
        if (!data) return {};
        
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('❌ Ошибка парсинга JSON данных:', e);
                return {};
            }
        } else if (typeof data === 'object') {
            return data;
        }
        return {};
    }
    
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
            if (!reports[dateKey][warehouse][shift]) reports[dateKey][warehouse][shift] = {};
            
            const reportData = parseReportData(report.data);
            
            // Объединяем данные операционного отчета с существующими данными
            reports[dateKey][warehouse][shift] = {
                ...reports[dateKey][warehouse][shift],
                ...reportData
            };
            
            console.log(`✅ Добавлен операционный отчет для ${warehouse}, категорий: ${Object.keys(reportData).length}`);
        }
    });
    
    // Обрабатываем отчеты по персоналу
    personnelReports.forEach(report => {
        console.log(`📊 Обработка отчета по персоналу:`, {
            report_date: report.report_date,
            shift_type: report.shift_type,
            warehouse: report.warehouse,
            hasData: !!report.data
        });
        
        if (report.report_date === dateISO && report.shift_type === shiftType) {
            const warehouse = report.warehouse;
            const shift = report.shift_type;
            
            if (!reports[dateKey][warehouse]) reports[dateKey][warehouse] = {};
            if (!reports[dateKey][warehouse][shift]) reports[dateKey][warehouse][shift] = {};
            
            const reportData = parseReportData(report.data);
            
            // Объединяем данные отчета по персоналу с существующими данными
            reports[dateKey][warehouse][shift] = {
                ...reports[dateKey][warehouse][shift],
                ...reportData
            };
            
            console.log(`✅ Добавлен отчет по персоналу для ${warehouse}, категорий: ${Object.keys(reportData).length}`);
        }
    });
    
    console.log(`📊 Итоговая структура:`, Object.keys(reports[dateKey] || {}));
    
    // Логируем итоговое количество данных для каждого склада
    Object.keys(reports[dateKey] || {}).forEach(warehouse => {
        const shiftData = reports[dateKey][warehouse][shiftType];
        if (shiftData) {
            console.log(`📊 Итого для ${warehouse}: ${Object.keys(shiftData).length} категорий`);
        }
    });
    
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
    try {
        console.log('⏰ Напоминание дневной смены (07:45)');
        const date = getCurrentDateISO();
        await sendReminder(date, 'day');
    } catch (error) {
        console.error('❌ Ошибка при отправке напоминания дневной смены:', error);
    }
}, {
    timezone: 'Europe/Moscow'
});

// Дневная смена - итоговый отчет в 08:00
cron.schedule('0 8 * * *', async () => {
    try {
        console.log('⏰ Итоговый отчет дневной смены (08:00)');
        const date = getCurrentDateISO();
        await sendFinalReport(date, 'day');
    } catch (error) {
        console.error('❌ Ошибка при отправке итогового отчета дневной смены:', error);
    }
}, {
    timezone: 'Europe/Moscow'
});

// Ночная смена - напоминание в 21:45
cron.schedule('45 21 * * *', async () => {
    try {
        console.log('⏰ Напоминание ночной смены (21:45)');
        const date = getCurrentDateISO();
        await sendReminder(date, 'night');
    } catch (error) {
        console.error('❌ Ошибка при отправке напоминания ночной смены:', error);
    }
}, {
    timezone: 'Europe/Moscow'
});

// Ночная смена - итоговый отчет в 22:00
cron.schedule('0 22 * * *', async () => {
    try {
        console.log('⏰ Итоговый отчет ночной смены (22:00)');
        const date = getCurrentDateISO();
        await sendFinalReport(date, 'night');
    } catch (error) {
        console.error('❌ Ошибка при отправке итогового отчета ночной смены:', error);
    }
}, {
    timezone: 'Europe/Moscow'
});

// Health check endpoint (для облачных платформ)
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    // Обработка ошибок для всего запроса
    req.on('error', (error) => {
        console.error('❌ Ошибка запроса:', error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Internal server error' }));
        }
    });
    
    res.on('error', (error) => {
        console.error('❌ Ошибка ответа:', error);
    });
    
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
        try {
            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
            }
            const result = await testSendMessage();
            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
            }
            res.end(JSON.stringify({ 
                status: result ? 'success' : 'error',
                message: result ? 'Тестовое сообщение отправлено' : 'Ошибка отправки'
            }));
        } catch (error) {
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
            }
            res.end(JSON.stringify({ 
                status: 'error',
                message: error.message
            }));
        }
    } else if (urlPath === '/send-report' && req.method === 'GET') {
        // Ручная отправка отчёта
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
            
            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
            }
            res.end(JSON.stringify({ 
                status: result ? 'success' : 'error',
                message: result ? `Отчёт отправлен (${shiftType === 'day' ? 'Дневная' : 'Ночная'} смена)` : 'Ошибка отправки',
                date: getCurrentDate(),
                shift: shiftType
            }));
        } catch (error) {
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
            }
            res.end(JSON.stringify({ 
                status: 'error',
                message: error.message
            }));
        }
    } else if (urlPath === '/test-image' && req.method === 'GET') {
        // Тестовый endpoint для проверки генерации изображения
        try {
            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
            }
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
            
            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
            }
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
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
            }
            res.end(JSON.stringify({ 
                status: 'error',
                message: error.message,
                stack: error.stack
            }));
        }
    } else {
        console.log(`❌ 404: ${req.method} ${req.url}`);
        if (!res.headersSent) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
        }
    }
}).on('error', (error) => {
    console.error('❌ Ошибка сервера:', error);
});

server.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Test Telegram: http://localhost:${PORT}/test`);
    console.log(`🔗 Manual Report: http://localhost:${PORT}/send-report`);
    console.log(`🔗 Test Image: http://localhost:${PORT}/test-image`);
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Порт ${PORT} уже занят. Попробуйте другой порт.`);
    } else {
        console.error('❌ Ошибка запуска сервера:', error);
    }
    process.exit(1);
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

