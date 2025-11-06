// Тестовый скрипт для отправки изображения сводной таблицы в Telegram
import dotenv from 'dotenv';
dotenv.config();

import { getCurrentDateISO, sendFinalReport } from './index.js';

async function testSendImage() {
    console.log('🧪 Тестовая отправка изображения сводной таблицы в Telegram...');
    
    try {
        // Получаем текущую дату
        const dateISO = getCurrentDateISO();
        
        // Определяем смену по текущему времени
        const now = new Date();
        const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const hour = moscowTime.getHours();
        const shiftType = (hour >= 6 && hour < 18) ? 'day' : 'night';
        
        console.log(`📅 Дата: ${dateISO}`);
        console.log(`🌓 Смена: ${shiftType === 'day' ? 'Дневная' : 'Ночная'}`);
        
        // Отправляем отчет
        const result = await sendFinalReport(dateISO, shiftType);
        
        if (result) {
            console.log('✅ Изображение успешно отправлено в Telegram!');
            process.exit(0);
        } else {
            console.error('❌ Ошибка отправки изображения');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testSendImage();

