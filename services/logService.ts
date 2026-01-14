import { getDbPath } from './storageService';

const fs = window.require('fs');
const path = window.require('path');

const LOG_FILE_NAME = 'activity_log.txt';

export const logActionAsync = async (operator: string, action: string, details: string = '') => {
    try {
        const dbPath = getDbPath();
        if (!dbPath) return; // Cannot log if no DB path is set

        const logPath = path.join(dbPath, LOG_FILE_NAME);
        const timestamp = new Date().toLocaleString('it-IT');

        // Format: [DATE TIME] | [USER] | [ACTION] | [DETAILS]
        const logLine = `[${timestamp}] | ${operator.padEnd(20)} | ${action.padEnd(20)} | ${details}\n`;

        // Append to file, create if doesn't exist
        await fs.promises.appendFile(logPath, logLine, 'utf8');
    } catch (error) {
        console.error("Failed to write to log", error);
    }
};
