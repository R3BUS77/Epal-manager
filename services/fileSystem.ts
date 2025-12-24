const fs = window.require('fs');
const path = window.require('path');
const { exec } = window.require('child_process');
const os = window.require('os');

export interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    lastModified?: Date;
    type?: 'disk' | 'folder' | 'file'; // For icon logic
}

export const getQuickAccess = (): FileEntry[] => {
    const home = os.homedir();
    return [
        { name: 'Desktop', path: path.join(home, 'Desktop'), isDirectory: true, type: 'folder' },
        { name: 'Documenti', path: path.join(home, 'Documents'), isDirectory: true, type: 'folder' },
        { name: 'Download', path: path.join(home, 'Downloads'), isDirectory: true, type: 'folder' },
        { name: 'Immagini', path: path.join(home, 'Pictures'), isDirectory: true, type: 'folder' },
        { name: 'Musica', path: path.join(home, 'Music'), isDirectory: true, type: 'folder' },
        { name: 'Video', path: path.join(home, 'Videos'), isDirectory: true, type: 'folder' },
    ];
};

export const getDrives = (): Promise<FileEntry[]> => {
    return new Promise((resolve) => {
        if (process.platform === 'win32') {
            exec('wmic logicaldisk get name', (error: any, stdout: string) => {
                if (error) {
                    resolve([{ name: 'C:', path: 'C:\\', isDirectory: true, type: 'disk' }]); // Fallback
                    return;
                }

                const drives = stdout
                    .split('\r\r\n')
                    .filter(value => /[A-Za-z]:/.test(value))
                    .map(value => {
                        const drive = value.trim();
                        return {
                            name: drive,
                            path: drive + '\\',
                            isDirectory: true,
                            type: 'disk' as const
                        };
                    });

                resolve(drives);
            });
        } else {
            resolve([{ name: 'Root', path: '/', isDirectory: true, type: 'disk' }]);
        }
    });
};

export const getDirectoryContents = async (dirPath: string): Promise<FileEntry[]> => {
    try {
        const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });

        const entries = dirents.map((dirent: any) => {
            return {
                name: dirent.name,
                path: path.join(dirPath, dirent.name),
                isDirectory: dirent.isDirectory(),
                type: dirent.isDirectory() ? 'folder' : 'file'
            };
        });

        // Sort: Directories first, then files
        return entries.sort((a: FileEntry, b: FileEntry) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
        throw err;
    }
};

export const getParentPath = (currentPath: string): string => {
    return path.dirname(currentPath);
};

export const pathExists = (p: string): boolean => {
    return fs.existsSync(p);
}
