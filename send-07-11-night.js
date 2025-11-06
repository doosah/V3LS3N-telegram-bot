// Отправка отчетов за 07.11.2025 ночная смена
import dotenv from 'dotenv';
dotenv.config();

import { sendFinalReport } from './index.js';

async function sendReports() {
    console.log('📊 Отправка отчетов за 07.11.2025 ночная смена...');
    
    try {
        const dateISO = '2025-11-07';
        const shiftType = 'night';
        
        console.log(`📅 Дата: ${dateISO} (07.11.2025)`);
        console.log(`🌓 Смена: Ночная`);
        console.log('');
        
        // Отправляем отчеты (операционные и персонал)
        const result = await sendFinalReport(dateISO, shiftType);
        
        if (result) {
            console.log('');
            console.log('✅ Отчеты успешно отправлены в Telegram!');
            process.exit(0);
        } else {
            console.error('❌ Ошибка отправки отчетов');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

sendReports();

