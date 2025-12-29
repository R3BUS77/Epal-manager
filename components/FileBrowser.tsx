import React, { useState, useEffect } from 'react';
import {
    Folder,
    File,
    HardDrive,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Search,
    Home,
    Monitor,
    FileText,
    Image as ImageIcon,
    Music,
    Video,
    Download,
    Save,
    Check,
    Disc,
    ChevronRight,
    LayoutGrid,
    X,
    Maximize2,
    Minus
} from 'lucide-react';
import {
    getDrives,
    getDirectoryContents,
    getParentPath,
    getQuickAccess,
    FileEntry,
    pathExists,
    resolveShortcut,
    isDirectoryPath
} from '../services/fileSystem';

interface FileBrowserProps {
    mode: 'directory' | 'file' | 'save';
    onSelect: (path: string) => void;
    onCancel: () => void;
    initialPath?: string;
    allowedExtensions?: string[];
    title?: string;
    defaultSaveName?: string;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
    mode,
    onSelect,
    onCancel,
    initialPath,
    allowedExtensions,
    title,
    defaultSaveName
}) => {
    const [currentPath, setCurrentPath] = useState<string>(initialPath || '');
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [drives, setDrives] = useState<FileEntry[]>([]);
    const [quickAccess, setQuickAccess] = useState<FileEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<string | null>(null); // Changed from selectedFile
    const [saveFileName, setSaveFileName] = useState<string>(defaultSaveName || '');

    // Address bar state
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [pathInput, setPathInput] = useState('');

    useEffect(() => {
        const init = async () => {
            const d = await getDrives();
            setDrives(d);
            setQuickAccess(getQuickAccess());

            if (currentPath && pathExists(currentPath)) {
                navigateTo(currentPath);
            } else if (d.length > 0) {
                navigateTo(d[0].path);
            }
        };
        init();
    }, []);

    useEffect(() => {
        setPathInput(currentPath);
    }, [currentPath]);

    const navigateTo = async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            const items = await getDirectoryContents(path);
            const filtered = items.filter(item => {
                if (item.isDirectory) return true;
                // Show all files in all modes, relying on isSelectable for interaction restrictions
                return true;
            });

            setEntries(filtered);
            setCurrentPath(path);
            setSelectedEntry(null);
            setIsEditingPath(false);
        } catch (err) {
            setError("Impossibile accedere al percorso.");
        } finally {
            setLoading(false);
        }
    };

    const isSelectable = (entry: FileEntry) => {
        if (entry.isDirectory) return true;
        if (allowedExtensions && (mode === 'file' || mode === 'save')) {
            return allowedExtensions.some(ext => entry.name.toLowerCase().endsWith(ext.toLowerCase()));
        }
        return true;
    };

    const handleEntryClick = (entry: FileEntry) => {
        if (!isSelectable(entry)) return;

        setSelectedEntry(entry.path);
        if (!entry.isDirectory && mode === 'save') {
            setSaveFileName(entry.name);
        }
    };

    const handleEntryDoubleClick = (entry: FileEntry) => {
        if (!isSelectable(entry)) {
            // Check if it is a shortcut (.lnk) even if not selectable by extension filter
            // Wait, if it's not selectable, we usually don't want to do anything?
            // User request: "fai in modo che solo i file .json possano essere selezionati... il resto viene gestito come fa eplora risorse"
            // Windows Explorer: if you are filtering for .txt, can you double click a .lnk to a folder? Yes, you can navigate.
            // So we should allow double click on .lnk IF it leads to a folder.
        }

        if (entry.isDirectory) {
            navigateTo(entry.path);
            return;
        }

        // Shortcut logic
        if (entry.name.toLowerCase().endsWith('.lnk')) {
            const target = resolveShortcut(entry.path);
            if (target && isDirectoryPath(target)) {
                navigateTo(target);
                return;
            }
            // If target is file, and file mode, check if selectable?
            // User said: "se fatto doppio click il collegamento funzioni ma solo se per cartelle o link a server il resto rimane tutto invariato"
            // Implies: only follow directory/server shortcuts. File shortcuts -> do nothing (invariato).
            return;
        }

        if (!isSelectable(entry)) return;

        // If it's a file, treat as confirmation
        if (mode === 'file') {
            onSelect(entry.path);
        } else if (mode === 'save') {
            setSaveFileName(entry.name);
        }
    };

    const goUp = () => {
        const parent = getParentPath(currentPath);
        if (parent && parent !== currentPath) {
            navigateTo(parent);
        }
    };

    const handleConfirm = () => {
        if (mode === 'directory') {
            // If a directory is selected in the view, maybe we want to select THAT one?
            // Standard Windows "Open Folder" dialog: if you single click a folder and click "Select Folder", it selects that folder.
            // If you are just inside a folder and click "Select Folder", it selects the current folder.
            // Let's check selectedEntry.
            if (selectedEntry) {
                // We need to know if selectedEntry is a directory. 
                // We can find it in entries.
                const entry = entries.find(e => e.path === selectedEntry);
                if (entry && entry.isDirectory) {
                    onSelect(entry.path);
                    return;
                }
            }
            onSelect(currentPath);
        } else if (mode === 'file') {
            if (selectedEntry) {
                const entry = entries.find(e => e.path === selectedEntry);
                if (entry && !entry.isDirectory) {
                    onSelect(selectedEntry);
                }
            }
        } else if (mode === 'save') {
            if (!saveFileName) return;
            const fs = window.require('path');
            const fullPath = fs.join(currentPath, saveFileName);
            onSelect(fullPath);
        }
    };

    const handlePathSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigateTo(pathInput);
    };

    const getQuickAccessIcon = (name: string) => {
        switch (name) {
            case 'Desktop': return <Monitor className="w-4 h-4" />;
            case 'Documenti': return <FileText className="w-4 h-4" />;
            case 'Download': return <Download className="w-4 h-4" />;
            case 'Immagini': return <ImageIcon className="w-4 h-4" />;
            case 'Musica': return <Music className="w-4 h-4" />;
            case 'Video': return <Video className="w-4 h-4" />;
            default: return <Folder className="w-4 h-4" />;
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-[#f8fafc] flex flex-col font-sans animate-fadeIn text-slate-800 h-full">

            {/* Windows-style Header: Title Bar + Navigation Bar */}
            <div className="bg-white border-b border-slate-200 shadow-sm shrink-0 z-20">
                {/* Title Bar (Visual only, simulates window title) */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        {title || (mode === 'save' ? 'Salva con nome' : 'Sfoglia file')}
                    </div>
                </div>

                {/* Navigation Tools Bar */}
                <div className="flex items-center gap-4 px-4 py-3">
                    {/* Nav Controls */}
                    <div className="flex items-center gap-2">
                        <button onClick={goUp} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-blue-600 disabled:opacity-30">
                            <ArrowUp className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Address Bar */}
                    <div
                        className={`flex-1 flex items-center bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-sm group transition-all
                            ${isEditingPath ? 'bg-white ring-2 ring-blue-500/20 border-blue-400' : 'hover:border-slate-300'}`}
                        onClick={() => {
                            if (!isEditingPath) {
                                setIsEditingPath(true);
                                // Optional: focus input handled by autoFocus
                            }
                        }}
                    >
                        <Monitor className={`w-4 h-4 mr-2 shrink-0 ${isEditingPath ? 'text-blue-500' : 'text-slate-400'}`} />

                        <div className="flex-1 flex items-center min-h-[20px] overflow-hidden">
                            {isEditingPath ? (
                                <form onSubmit={handlePathSubmit} className="w-full">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={pathInput}
                                        onChange={(e) => setPathInput(e.target.value)}
                                        onBlur={() => {
                                            setIsEditingPath(false);
                                            setPathInput(currentPath); // Reset on cancel
                                        }}
                                        className="w-full bg-transparent border-none p-0 text-slate-700 focus:outline-none text-sm"
                                    />
                                </form>
                            ) : (
                                <div className="flex-1 flex items-center gap-1 text-slate-700 overflow-x-auto whitespace-nowrap scrollbar-hide">
                                    {currentPath.split('\\').map((part, index, arr) => (
                                        <React.Fragment key={index}>
                                            <span
                                                className="hover:bg-slate-200 px-1 rounded cursor-pointer transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const path = arr.slice(0, index + 1).join('\\');
                                                    navigateTo(path || '\\'); // Handle root if needed, though usually C:\ splits to ["C:", ""]
                                                }}
                                            >
                                                {part || (index === 0 ? '' : 'Questa PC')} {/* Logic for empty parts needs care, usually "C:" is first part */}
                                                {!part && index === 0 && arr.length > 1 ? '' : part}
                                            </span>
                                            {index < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="w-64 bg-slate-100 border border-slate-200 rounded-md px-3 py-2 flex items-center gap-2 text-sm focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input type="text" placeholder={`Cerca in ${currentPath.split('\\').pop() || 'PC'}`} className="bg-transparent border-none w-full focus:outline-none placeholder:text-slate-400 text-slate-700" />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* Left Sidebar - Navigation Pane */}
                <div className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 py-4">
                    <div className="space-y-6 px-2">
                        {/* Quick Access */}
                        <div>
                            <div className="px-3 mb-2 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider opacity-80">
                                Accesso Rapido
                            </div>
                            <div className="space-y-0.5">
                                {quickAccess.map(item => (
                                    <button
                                        key={item.path}
                                        onClick={() => navigateTo(item.path)}
                                        className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2.5 text-sm transition-all
                                            ${currentPath === item.path
                                                ? 'bg-blue-100/50 text-blue-700 font-medium'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <span className={currentPath === item.path ? 'text-blue-600' : 'text-slate-400'}>
                                            {getQuickAccessIcon(item.name)}
                                        </span>
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Drives */}
                        <div>
                            <div className="px-3 mb-2 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider opacity-80">
                                Questo PC
                            </div>
                            <div className="space-y-0.5">
                                {drives.map(drive => (
                                    <button
                                        key={drive.path}
                                        onClick={() => navigateTo(drive.path)}
                                        className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2.5 text-sm transition-all
                                            ${currentPath.startsWith(drive.path)
                                                ? 'bg-slate-100 text-slate-900 font-medium'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <HardDrive className={`w-4 h-4 ${currentPath.startsWith(drive.path) ? 'text-blue-600' : 'text-slate-400'}`} />
                                        {drive.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area - File List */}
                <div className="flex-1 flex flex-col bg-white relative overflow-hidden"
                    onClick={() => setSelectedEntry(null)} // Click on whitespace deselects
                >

                    {/* Column Headers */}
                    <div className="grid grid-cols-12 px-4 py-2 border-b border-slate-200 bg-white text-xs font-semibold text-slate-500 sticky top-0 z-10 shrink-0">
                        <div className="col-span-6 pl-2 border-r border-transparent hover:border-slate-300 cursor-pointer">Nome</div>
                        <div className="col-span-4 pl-2 border-r border-transparent hover:border-slate-300 cursor-pointer">Ultima Modifica</div>
                        <div className="col-span-2 pl-2 cursor-pointer">Tipo</div>
                    </div>

                    {/* File Entries */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-white">
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center cursor-wait">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}

                        <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                            {entries.length === 0 && !loading && !error && (
                                <div className="py-20 text-center text-slate-400 text-sm">
                                    Cartella vuota
                                </div>
                            )}

                            {entries.map((entry) => {
                                const isSelected = selectedEntry === entry.path;
                                const selectable = isSelectable(entry);
                                const isDimmed = !selectable;

                                return (
                                    <div
                                        key={entry.name}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEntryClick(entry)
                                        }}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            handleEntryDoubleClick(entry)
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Invoke context menu via IPC
                                            const { ipcRenderer } = window.require('electron');
                                            ipcRenderer.invoke('show-context-menu', entry.path);
                                        }}
                                        className={`grid grid-cols-12 px-2 py-1.5 items-center cursor-default text-sm select-none border border-transparent rounded-sm
                                            ${isSelected
                                                ? 'bg-blue-100/50 border-blue-200/50 text-slate-900'
                                                : isDimmed
                                                    ? 'text-slate-400 cursor-not-allowed hover:bg-transparent'
                                                    : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <div className="col-span-6 flex items-center gap-2 overflow-hidden">
                                            {entry.isDirectory ? (
                                                <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-500' : 'text-amber-400'}`} fill="currentColor" fillOpacity={0.2} />
                                            ) : (
                                                <File className={`w-4 h-4 shrink-0 ${isDimmed ? 'text-slate-300' : 'text-slate-400'}`} />
                                            )}
                                            <span className="truncate">
                                                {entry.name}
                                            </span>
                                        </div>
                                        <div className={`col-span-4 text-xs ${isDimmed ? 'text-slate-300' : 'text-slate-500'}`}>
                                            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className={`col-span-2 text-xs truncate ${isDimmed ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {entry.isDirectory ? 'Cartella di file' : 'File'}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action Footer - Windows Style */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-4 shrink-0 z-20">
                {mode === 'save' && (
                    <div className="flex-1 max-w-2xl flex items-center gap-3">
                        <label className="text-sm text-slate-700 whitespace-nowrap">Nome file:</label>
                        <div className="flex-1 flex items-center bg-white border border-slate-300 hover:border-blue-400 rounded-sm overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                            <input
                                type="text"
                                value={saveFileName}
                                onChange={(e) => setSaveFileName(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm text-slate-800 focus:outline-none"
                            />
                            <div className="px-3 py-1.5 bg-slate-100 text-slate-500 text-sm border-l border-slate-200">
                                .json
                            </div>
                        </div>
                    </div>
                )}

                {mode !== 'save' && <div className="flex-1"></div>}

                <div className="flex items-center gap-3">
                    <div className="flex items-center max-w-[200px] h-9 px-3 bg-white border border-slate-300 rounded-sm text-sm text-slate-600 mr-2 opacity-70 cursor-not-allowed">
                        File JSON (*.json)
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={(mode === 'file' && !selectedEntry) || (mode === 'save' && !saveFileName)}
                        className="h-9 px-8 bg-blue-600 hover:bg-blue-700 hover:shadow-sm text-white text-sm font-medium rounded-sm transition-all disabled:opacity-50 disabled:grayscale disabled:shadow-none min-w-[100px]"
                    >
                        {mode === 'save' ? 'Salva' : 'Seleziona cartella'}
                    </button>

                    <button
                        onClick={onCancel}
                        className="h-9 px-8 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-medium rounded-sm transition-all min-w-[100px]"
                    >
                        Annulla
                    </button>
                </div>
            </div>

        </div>
    );
};
