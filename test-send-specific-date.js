// Тестовый скрипт для отправки изображения сводной таблицы за конкретную дату
import dotenv from 'dotenv';
dotenv.config();

import { sendFinalReport } from './index.js';

async function testSendSpecificDate() {
    console.log('🧪 Тестовая отправка изображения сводной таблицы за 02.11.2025 ночная смена...');
    
    try {
        // Указываем конкретную дату
        const dateISO = '2025-11-02'; // 02.11.2025
        const shiftType = 'night'; // Ночная смена
        
        console.log(`📅 Дата: ${dateISO} (02.11.2025)`);
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

testSendSpecificDate();

