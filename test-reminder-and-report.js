// Тестовый скрипт для отправки напоминания и картинок за 06.11.2025 дневная смена
import dotenv from 'dotenv';
dotenv.config();

import { sendReminder, sendFinalReport } from './index.js';

async function testSendReminderAndReport() {
    console.log('🧪 Тестовая отправка напоминания и картинок за 06.11.2025 дневная смена...');
    
    const dateISO = '2025-11-06';
    const shiftType = 'day';
    
    try {
        // 1. Отправляем напоминание
        console.log('\n📨 Отправка напоминания...');
        const reminderResult = await sendReminder(dateISO, shiftType);
        console.log(`📨 Напоминание отправлено: ${reminderResult ? 'Да' : 'Нет'}`);
        
        // Небольшая задержка
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. Отправляем картинки
        console.log('\n📊 Отправка картинок...');
        const reportResult = await sendFinalReport(dateISO, shiftType);
        
        if (reportResult) {
            console.log('✅ Тест завершен успешно!');
            process.exit(0);
        } else {
            console.error('❌ Ошибка отправки картинок');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testSendReminderAndReport();
