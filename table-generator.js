// Генерация HTML таблицы и конвертация в изображение

// Данные конфигурации (из config.js)
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

const CATEGORIES = [
    {name: 'Обработка', type: 'number'},
    {name: 'Персонал', type: 'number'},
    {name: 'Окончание выдачи', type: 'time'},
    {name: 'Обработка FBS', type: 'number'},
    {name: 'Возвратный поток (Бэклог)', type: 'number'},
    {name: 'Обезличка', type: 'single', label: 'Поддоны', unit: 'шт'},
    {name: 'Эффективность', type: 'number'},
    {name: 'Кол-во паллета-мест к отгрузке', type: 'triple',
     fields: [{n: 'FBS', u: 'шт'}, {n: 'X-Dock', u: 'шт'}, {n: 'Возвраты', u: 'шт'}]},
    {name: 'Хронь ХД', type: 'double',
     fields: [{n: 'Сорт', u: 'шт'}, {n: 'Нон-Сорт', u: 'шт'}]},
    {name: 'Риски', type: 'yesno'},
    {name: 'Промежуточная Выдача', type: 'single', label: 'Значение', unit: 'шт'},
    {name: '% не профиля', type: 'single', label: 'Процент', unit: '%'},
    {name: 'Руководитель', type: 'select', options: ['Территория 1 Шутин Д.М.', 'Территория 2 Любавкская М.И.']}
];

// Функция удалена - используется transformSupabaseDataForTable из index.js

/**
 * Парсинг времени в минуты (HH:MM -> minutes)
 */
function parseTimeToMin(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return NaN;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return NaN;
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return h * 60 + m;
}

/**
 * Генерация HTML таблицы
 */
export function generateTableHTML(reports, dateISO, shiftType) {
    const dateDisplay = dateISO.split('-').reverse().join('.');
    const reportsData = reports[dateDisplay] || {};
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #000000;
            color: #ffffff;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 20px;
        }
        .table-wrapper {
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 8px;
            overflow: auto;
            background: rgba(0, 0, 0, 0.85);
        }
        table {
            width: 100%;
            min-width: 600px;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 10px;
            table-layout: fixed;
        }
        th, td {
            border: 1px solid rgba(71, 85, 105, 0.3);
            padding: 4px 3px;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
        }
        th {
            font-size: 9px;
            line-height: 1.3;
            padding: 6px 4px;
            position: sticky;
            top: 0;
            font-weight: 600;
            z-index: 10;
            background: linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 58, 95, 0.95) 100%);
            color: #e0e0e0;
        }
        td:first-child, th:first-child {
            width: 70px;
            min-width: 70px;
            max-width: 70px;
            position: sticky;
            left: 0;
            z-index: 5;
            font-size: 9px;
            background: rgba(0, 0, 0, 0.9);
        }
        th:first-child {
            z-index: 15;
        }
        td:nth-child(2), th:nth-child(2) {
            width: 140px;
            min-width: 140px;
            max-width: 140px;
            position: sticky;
            left: 70px;
            z-index: 5;
            text-align: left;
            padding-left: 6px;
            font-size: 9px;
            background: rgba(0, 0, 0, 0.9);
        }
        th:nth-child(n+3), td:nth-child(n+3) {
            min-width: 35px;
            max-width: 50px;
            padding: 3px 2px;
            font-size: 9px;
        }
        td.negative, td.bad {
            color: #ee0000;
            font-weight: 900;
            text-shadow: 0 0 8px rgba(255, 0, 0, 0.8), 0 0 12px rgba(238, 0, 0, 0.6);
        }
        td.positive, td.good {
            color: #43e97b;
            font-weight: 600;
            text-shadow: 0 0 8px rgba(67, 233, 123, 0.4);
        }
        .summary-total {
            background: linear-gradient(135deg, #2d2d2d 0%, #1e3a5f 50%, #404040 100%);
            color: #ffffff;
            padding: 15px;
            text-align: center;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
            border-radius: 8px;
            text-shadow: 0 2px 10px rgba(255, 255, 255, 0.3);
        }
        h2 {
            text-align: center;
            margin-bottom: 15px;
            color: #ffffff;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <h2>📊 Сводная таблица - ${dateDisplay} (${shiftType === 'day' ? 'Дневная' : 'Ночная'} смена)</h2>
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Дата</th>
                    <th>Склад</th>
                    <th>ХА</th>
`;

    // Добавляем заголовки категорий
    CATEGORIES.forEach(cat => {
        if (cat.type === 'single' || cat.type === 'yesno' || cat.type === 'select') {
            html += `<th>${cat.name}</th>`;
        } else if (cat.type === 'triple') {
            html += `<th colspan="3">${cat.name}</th>`;
        } else if (cat.type === 'double') {
            html += `<th colspan="2">${cat.name}</th>`;
        } else {
            html += `<th colspan="3">${cat.name}</th>`;
        }
    });
    
    html += `<th>Тип</th></tr><tr><th>Дата</th><th>Склад</th><th>ХА</th>`;
    
    // Вторая строка заголовков
    CATEGORIES.forEach(cat => {
        if (cat.type === 'single') {
            html += `<th>${cat.unit || ''}</th>`;
        } else if (cat.type === 'triple' || cat.type === 'double') {
            cat.fields.forEach(f => html += `<th>${f.u}</th>`);
        } else if (cat.type === 'time') {
            html += '<th>План</th><th>Факт</th><th>Δ</th>';
        } else if (cat.type === 'number') {
            html += '<th>План</th><th>Факт</th><th>Δ</th>';
        } else {
            html += '<th></th>';
        }
    });
    
    html += '<th>Тип</th></tr></thead><tbody>';
    
    let totalVolumePlan = 0;
    
    // Добавляем строки данных
    WAREHOUSES.forEach(wh => {
        const whData = reportsData[wh] || {};
        const shiftData = whData[shiftType];
        
        if (shiftData) {
            html += `<tr><td>${dateDisplay}</td><td>${wh}</td><td>ХА</td>`;
            
            CATEGORIES.forEach(cat => {
                const data = shiftData[cat.name];
                
                if (cat.type === 'single') {
                    html += `<td>${data?.value || '-'}</td>`;
                } else if (cat.type === 'yesno') {
                    const val = data?.value;
                    const isBad = val === true || val === 'yes';
                    const className = isBad ? 'bad' : (val ? 'good' : '');
                    html += `<td class="${className}">${val ? (isBad ? '❌' : '✅') : '-'}</td>`;
                } else if (cat.type === 'select') {
                    html += `<td>${data?.value || '-'}</td>`;
                } else if (cat.type === 'triple') {
                    cat.fields.forEach(f => html += `<td>${data?.[f.n] || '-'}</td>`);
                } else if (cat.type === 'double') {
                    cat.fields.forEach(f => html += `<td>${data?.[f.n] || '-'}</td>`);
                } else if (cat.type === 'time') {
                    const plan = data?.plan || '';
                    const fact = data?.fact || '';
                    html += `<td>${plan || '-'}</td><td>${fact || '-'}</td>`;
                    
                    // Вычисляем дельту: если факт <= план, то "Норма" (✅), иначе "Отклонение" (❌)
                    let delta = '';
                    let isGood = false;
                    if (plan && fact) {
                        const planMin = parseTimeToMin(plan);
                        const factMin = parseTimeToMin(fact);
                        if (!isNaN(planMin) && !isNaN(factMin)) {
                            isGood = factMin <= planMin;
                            delta = isGood ? '✅' : '❌';
                        } else {
                            delta = '❌';
                        }
                    }
                    html += `<td class="${isGood ? 'good' : (delta ? 'bad' : '')}">${delta || '-'}</td>`;
                } else if (cat.type === 'number') {
                    const plan = parseFloat(data?.plan) || 0;
                    const fact = parseFloat(data?.fact) || 0;
                    html += `<td>${plan || '-'}</td><td>${fact || '-'}</td>`;
                    
                    // Вычисляем дельту: факт - план
                    let delta = '';
                    let deltaClass = '';
                    if (plan !== 0 || fact !== 0) {
                        delta = fact - plan;
                        deltaClass = delta >= 0 ? 'positive' : 'negative';
                    }
                    html += `<td class="${deltaClass}">${delta !== '' ? delta : '-'}</td>`;
                    
                    if (cat.name === 'Обработка') {
                        totalVolumePlan += plan;
                    }
                }
            });
            
            html += `<td>${shiftType === 'day' ? '☀️' : '🌙'}</td></tr>`;
        } else {
            // Пустая строка
            html += `<tr><td>${dateDisplay}</td><td>${wh}</td><td>ХА</td>`;
            const numCols = CATEGORIES.reduce((acc, cat) => {
                if (cat.type === 'single' || cat.type === 'yesno' || cat.type === 'select' || cat.type === 'time') return acc + 1;
                if (cat.type === 'triple') return acc + 3;
                if (cat.type === 'double') return acc + 2;
                return acc + 3;
            }, 0);
            for (let i = 0; i < numCols; i++) html += '<td>-</td>';
            html += '<td>-</td></tr>';
        }
    });
    
    html += `</tbody></table></div>`;
    html += `<div class="summary-total">📄 Итого по Объёму (план): ${totalVolumePlan}</div>`;
    html += `</body></html>`;
    
    return html;
}

/**
 * Конвертация HTML в изображение через Puppeteer
 */
export async function htmlToImage(html) {
    console.log('🔧 Импорт Puppeteer...');
    let puppeteer;
    try {
        puppeteer = (await import('puppeteer')).default;
        console.log('✅ Puppeteer импортирован');
    } catch (importError) {
        console.error('❌ Ошибка импорта Puppeteer:', importError.message);
        throw new Error('Puppeteer не установлен. Установите: npm install puppeteer');
    }
    
    console.log('🚀 Запуск браузера Puppeteer...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    });
    
    console.log('✅ Браузер запущен');
    
    try {
        const page = await browser.newPage();
        console.log('📄 Установка контента...');
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        console.log('📐 Установка viewport...');
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('📸 Создание скриншота...');
        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: true,
            clip: null
        });
        
        console.log('✅ Скриншот создан');
        return screenshot;
    } catch (screenshotError) {
        console.error('❌ Ошибка создания скриншота:', screenshotError.message);
        throw screenshotError;
    } finally {
        console.log('🔒 Закрытие браузера...');
        await browser.close();
    }
}

