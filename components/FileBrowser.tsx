import React, { useState, useEffect } from 'react';
import {
    Folder,
    File,
    HardDrive,
    ArrowUp,
    X,
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
    Disc
} from 'lucide-react';
import { getDrives, getDirectoryContents, getParentPath, getQuickAccess, FileEntry, pathExists } from '../services/fileSystem';

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
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [saveFileName, setSaveFileName] = useState<string>(defaultSaveName || '');

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

    const navigateTo = async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            const items = await getDirectoryContents(path);
            const filtered = items.filter(item => {
                if (item.isDirectory) return true;
                if (mode === 'directory') return false;
                if ((mode === 'file' || mode === 'save') && allowedExtensions) {
                    return allowedExtensions.some(ext => item.name.toLowerCase().endsWith(ext.toLowerCase()));
                }
                return true;
            });

            setEntries(filtered);
            setCurrentPath(path);
            setSelectedFile(null);
        } catch (err) {
            setError("Accesso negato o percorso non valido.");
        } finally {
            setLoading(false);
        }
    };

    const handleEntryClick = (entry: FileEntry) => {
        if (entry.isDirectory) {
            navigateTo(entry.path);
        } else {
            if (mode === 'file') {
                setSelectedFile(entry.path);
            } else if (mode === 'save') {
                setSaveFileName(entry.name);
            }
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
            onSelect(currentPath);
        } else if (mode === 'file') {
            if (selectedFile) onSelect(selectedFile);
        } else if (mode === 'save') {
            if (!saveFileName) return;
            const fs = window.require('path');
            const fullPath = fs.join(currentPath, saveFileName);
            onSelect(fullPath);
        }
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
        <div className="fixed inset-0 z-[60] bg-[#09090b] flex items-center justify-center p-6 animate-fadeIn font-sans">

            {/* Glossy Container - Adjusted height and corners */}
            <div className="w-full max-w-5xl h-[85vh] bg-[#1e1e1e] rounded-3xl shadow-2xl flex flex-col border border-white/10 relative overflow-hidden ring-1 ring-white/10">

                {/* Gloss Effect - Subtle */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>

                {/* Ambient Glows - Toned down for "Clean" look */}
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Title Bar - Rounded Top corners handled by container overflow */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#252526] border-b border-black/20 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#2d2d30] rounded-xl border border-white/5 shadow-inner">
                            {mode === 'save' ? <Save className="w-5 h-5 text-blue-400" /> : <Folder className="w-5 h-5 text-amber-400" />}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-100 tracking-tight">
                                {title || (mode === 'save' ? 'Salva con nome' : 'Esplora Risorse')}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="group p-2 hover:bg-[#c42b1c] rounded-lg transition-colors"
                        title="Chiudi"
                    >
                        <X className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    </button>
                </div>

                {/* Navigation Bar */}
                <div className="px-6 py-3 bg-black/20 border-b border-white/5 flex items-center gap-3 z-10 shrink-0">
                    <button onClick={goUp} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all active:scale-95">
                        <ArrowUp className="w-5 h-5" />
                    </button>

                    {/* Path Bar */}
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 text-sm text-gray-300 shadow-inner group transition-colors hover:border-white/20">
                        <HardDrive className="w-4 h-4 text-blue-400" />
                        <span className="truncate font-mono tracking-tight">{currentPath}</span>
                    </div>

                    {/* Search */}
                    <div className="w-64 bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 text-sm text-gray-500 shadow-inner">
                        <Search className="w-4 h-4" />
                        <span>Cerca...</span>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden z-10">
                    {/* Sidebar */}
                    <div className="w-64 bg-black/10 border-r border-white/5 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar shrink-0">

                        {/* Quick Access */}
                        <div>
                            <div className="px-3 mb-2 flex items-center gap-2 text-[11px] font-bold text-blue-400 uppercase tracking-widest opacity-80">
                                <Home className="w-3 h-3" /> Accesso Rapido
                            </div>
                            <div className="space-y-1">
                                {quickAccess.map(item => (
                                    <button
                                        key={item.path}
                                        onClick={() => navigateTo(item.path)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all duration-300 border border-transparent 
                                ${currentPath === item.path
                                                ? 'bg-blue-600/20 text-white border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 hover:border-white/10'
                                            }`}
                                    >
                                        {getQuickAccessIcon(item.name)}
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Drives */}
                        <div>
                            <div className="px-3 mb-2 flex items-center gap-2 text-[11px] font-bold text-indigo-400 uppercase tracking-widest opacity-80">
                                <Disc className="w-3 h-3" /> Questo PC
                            </div>
                            <div className="space-y-1">
                                {drives.map(drive => (
                                    <button
                                        key={drive.path}
                                        onClick={() => navigateTo(drive.path)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all duration-300 border border-transparent 
                                ${currentPath.startsWith(drive.path)
                                                ? 'bg-indigo-600/20 text-white border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 hover:border-white/10'
                                            }`}
                                    >
                                        <HardDrive className="w-4 h-4" />
                                        {drive.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* File View */}
                    <div className="flex-1 bg-transparent p-2 overflow-y-auto relative custom-scrollbar">
                        {loading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
                            </div>
                        )}

                        {/* Table Header */}
                        <div className="grid grid-cols-12 px-5 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider border-b border-white/5 mb-2 sticky top-0 bg-[#1e1e1e]/95 backdrop-blur z-10 w-full">
                            <div className="col-span-6">Nome</div>
                            <div className="col-span-4">Ultima modifica</div>
                            <div className="col-span-2 text-right">Tipo</div>
                        </div>

                        {/* List View */}
                        <div className="space-y-1 px-2 pb-4 w-full">
                            {entries.length === 0 && !loading && !error && (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-500 opacity-50">
                                    <Folder className="w-16 h-16 mb-4 stroke-1" />
                                    <p className="text-lg font-medium">Cartella vuota</p>
                                </div>
                            )}

                            {entries.map(entry => {
                                // Selection logic
                                const isSelected = selectedFile === entry.path || (mode === 'save' && saveFileName === entry.name);

                                return (
                                    <div
                                        key={entry.name}
                                        onClick={() => handleEntryClick(entry)}
                                        onDoubleClick={() => entry.isDirectory && navigateTo(entry.path)}
                                        className={`
                                     grid grid-cols-12 px-4 py-3 items-center gap-2 cursor-pointer w-full
                                     rounded-xl border border-transparent transition-all duration-200 group relative overflow-hidden
                                     ${isSelected
                                                ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.01]'
                                                : 'hover:bg-white/5 hover:border-white/10 hover:scale-[1.005]'
                                            }
                                 `}
                                    >
                                        {/* Highlight Bar */}
                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>}

                                        <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                                            {entry.isDirectory ? (
                                                <div className="relative shrink-0">
                                                    <Folder className={`w-5 h-5 ${isSelected ? 'text-blue-400 fill-blue-400/20' : 'text-amber-400 fill-amber-400/20'}`} />
                                                    {isSelected && <div className="absolute inset-0 bg-blue-400 blur-lg opacity-40"></div>}
                                                </div>
                                            ) : (
                                                <File className={`w-5 h-5 shrink-0 ${isSelected ? 'text-blue-300' : 'text-gray-400'}`} />
                                            )}
                                            <span className={`truncate font-medium ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{entry.name}</span>
                                        </div>
                                        <div className="col-span-4 text-xs text-gray-500 truncate group-hover:text-gray-400 transition-colors">
                                            {new Date().toLocaleDateString()}
                                        </div>
                                        <div className="col-span-2 text-right text-xs text-gray-600 font-medium group-hover:text-gray-500">
                                            {entry.isDirectory ? 'Cartella' : 'File'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Area */}
                <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex items-center gap-4 justify-end z-10 backdrop-blur-md shrink-0">

                    {mode === 'save' && (
                        <div className="flex-1 flex items-center gap-3 max-w-xl bg-black/40 p-1.5 rounded-xl border border-white/10 focus-within:border-blue-500/50 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
                            <span className="text-xs font-bold text-gray-500 px-2 uppercase tracking-wide">Nome:</span>
                            <input
                                type="text"
                                value={saveFileName}
                                onChange={(e) => setSaveFileName(e.target.value)}
                                className="flex-1 bg-transparent text-white text-sm px-2 py-1 focus:outline-none placeholder-gray-600"
                                placeholder="Nome del file..."
                            />
                            <div className="px-3 py-1 bg-white/5 rounded-lg text-xs text-gray-400 border border-white/5">
                                JSON (*.json)
                            </div>
                        </div>
                    )}

                    {mode !== 'save' && <div className="flex-1"></div>}

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm rounded-xl transition-all border border-white/5 hover:border-white/10 font-medium"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={(mode === 'file' && !selectedFile) || (mode === 'save' && !saveFileName)}
                            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40 hover:shadow-blue-600/30 hover:scale-105 active:scale-95 font-bold flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            {mode === 'save' ? 'Salva' : 'Apri'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
