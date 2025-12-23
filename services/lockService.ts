import { getDbPath } from './storageService';

const fs = window.require('fs');
const path = window.require('path');
const os = window.require('os');

const LOCK_FILE_NAME = 'lock.json';
const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds
const STALE_LOCK_MS = 60000; // 60 seconds

export interface LockInfo {
    operator: string;
    machine: string;
    lastHeartbeat: number;
}

let heartbeatTimer: NodeJS.Timeout | null = null;
let currentLockInfo: LockInfo | null = null;

const getLockFilePath = (): string | null => {
    const dbPath = getDbPath();
    if (!dbPath) return null;
    return path.join(dbPath, LOCK_FILE_NAME);
};

// Async Acquire Lock
export const acquireLockAsync = async (operator: string): Promise<{ success: boolean; info?: LockInfo }> => {
    const lockFile = getLockFilePath();
    if (!lockFile) return { success: false }; // No DB path yet

    try {
        const machine = os.hostname();
        const now = Date.now();
        const newLock: LockInfo = { operator, machine, lastHeartbeat: now };

        // Check if lock exists
        let lockExists = false;
        try {
            await fs.promises.access(lockFile);
            lockExists = true;
        } catch { }

        if (lockExists) {
            try {
                const content = await fs.promises.readFile(lockFile, 'utf-8');
                const existingLock: LockInfo = JSON.parse(content);

                // Check availability (is it me? or is it stale?)
                const isStale = (now - existingLock.lastHeartbeat) > STALE_LOCK_MS;
                const isMe = existingLock.machine === machine && existingLock.operator === operator;

                if (!isStale && !isMe) {
                    // Locked by active someone else
                    return { success: false, info: existingLock };
                }
                // If Stale or IsMe, fall through to overwrite
                console.log(isStale ? "Overwriting stale lock" : "Re-acquiring my own lock");
            } catch (e) {
                // Corrupt file? Overwrite safely
                console.warn("Lock file corrupt, overwriting", e);
            }
        }

        // Write Lock
        await fs.promises.writeFile(lockFile, JSON.stringify(newLock, null, 2));
        currentLockInfo = newLock;
        startHeartbeat();
        return { success: true, info: newLock };

    } catch (error) {
        console.error("Failed to acquire lock", error);
        return { success: false };
    }
};

// Sync version kept for compatibility (wraps async? No, sync calls cannot wrap async)
// We will deprecate sync usage in App.tsx
export const acquireLock = (operator: string): { success: boolean; info?: LockInfo } => {
    // This sync version is likely causing freezes too if used. 
    // We shall keep it but move App to use acquireLockAsync
    const lockFile = getLockFilePath();
    if (!lockFile) return { success: false };

    try {
        const machine = os.hostname();
        const now = Date.now();
        const newLock: LockInfo = { operator, machine, lastHeartbeat: now };

        if (fs.existsSync(lockFile)) {
            try {
                const content = fs.readFileSync(lockFile, 'utf-8');
                const existingLock: LockInfo = JSON.parse(content);
                const isStale = (now - existingLock.lastHeartbeat) > STALE_LOCK_MS;
                const isMe = existingLock.machine === machine && existingLock.operator === operator;
                if (!isStale && !isMe) return { success: false, info: existingLock };
            } catch (e) { }
        }
        fs.writeFileSync(lockFile, JSON.stringify(newLock, null, 2));
        currentLockInfo = newLock;
        startHeartbeat();
        return { success: true, info: newLock };
    } catch (error) {
        return { success: false };
    }
};

export const releaseLockAsync = async () => {
    stopHeartbeat();
    const lockFile = getLockFilePath();
    if (!lockFile || !currentLockInfo) return;

    try {
        // Only delete if it's still OUR lock (double check)
        try {
            await fs.promises.access(lockFile);
            const content = await fs.promises.readFile(lockFile, 'utf-8');
            const existingLock: LockInfo = JSON.parse(content);
            if (existingLock.machine === currentLockInfo.machine && existingLock.operator === currentLockInfo.operator) {
                await fs.promises.unlink(lockFile);
            }
        } catch { }
    } catch (error) {
        console.error("Error releasing lock", error);
    }
    currentLockInfo = null;
};

export const releaseLock = () => {
    stopHeartbeat();
    const lockFile = getLockFilePath();
    if (!lockFile || !currentLockInfo) return;
    try {
        if (fs.existsSync(lockFile)) {
            const content = fs.readFileSync(lockFile, 'utf-8');
            const existingLock: LockInfo = JSON.parse(content);
            if (existingLock.machine === currentLockInfo.machine && existingLock.operator === currentLockInfo.operator) {
                fs.unlinkSync(lockFile);
            }
        }
    } catch (error) { }
    currentLockInfo = null;
};

const startHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    heartbeatTimer = setInterval(async () => {
        if (!currentLockInfo) return;

        const lockFile = getLockFilePath();
        if (!lockFile) return;

        try {
            // Update timestamp
            currentLockInfo.lastHeartbeat = Date.now();
            // Async write for heartbeat to avoid stutter
            await fs.promises.writeFile(lockFile, JSON.stringify(currentLockInfo, null, 2));
        } catch (e) {
            console.error("Heartbeat failed", e);
        }
    }, HEARTBEAT_INTERVAL_MS);
};

const stopHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
};
