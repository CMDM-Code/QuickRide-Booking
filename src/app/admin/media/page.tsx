'use client';
import { useState, useEffect } from "react";

interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const saved = localStorage.getItem('quickride_media_library');
    if (saved) setFiles(JSON.parse(saved));
  }, []);

  const saveFiles = (newFiles: MediaFile[]) => {
    localStorage.setItem('quickride_media_library', JSON.stringify(newFiles));
    setFiles(newFiles);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newFile: MediaFile = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file), // Mock URL for local session
      uploadedAt: new Date().toISOString()
    };

    saveFiles([newFile, ...files]);
    alert("File uploaded to local session! Note: Local session files disappear on page refresh if not uploaded to cloud storage.");
  };

  const deleteFile = (id: string) => {
    if (!confirm('Delete this file?')) return;
    saveFiles(files.filter(f => f.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = filter === 'all' 
    ? files 
    : files.filter(f => f.type.includes(filter));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Media Library</h1>
          <p className="text-slate-600 mt-1">Manage vehicle photos, contracts, and digital assets.</p>
        </div>
        <div className="relative">
          <input 
            type="file" 
            id="media-upload" 
            className="hidden" 
            onChange={handleUpload}
          />
          <label 
            htmlFor="media-upload"
            className="px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold shadow-lg transition-all cursor-pointer inline-block"
          >
            Upload Asset
          </label>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Files</p>
            <p className="text-3xl font-black text-slate-900">{files.length}</p>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Storage used</p>
            <p className="text-3xl font-black text-green-700">{formatSize(files.reduce((s, f) => s + f.size, 0))}</p>
         </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3">
        {['all', 'image', 'video', 'pdf'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 min-h-[400px]">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="text-5xl mb-4">🖼️</div>
            <h3 className="text-xl font-black text-slate-900">Your gallery is empty</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">Upload vehicle photos or documents to start managing your library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredFiles.map(file => (
              <div key={file.id} className="group relative bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 aspect-square">
                 {file.type.startsWith('image/') ? (
                   <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-3xl">📄</div>
                 )}
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                    <p className="text-[10px] font-black text-white text-center truncate w-full mb-1">{file.name}</p>
                    <p className="text-[8px] text-white/70 font-bold uppercase">{formatSize(file.size)}</p>
                    <div className="mt-3 flex gap-2">
                       <button onClick={() => deleteFile(file.id)} className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 rounded-lg transition-colors">🗑️</button>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8">
         <div className="flex gap-6">
            <span className="text-3xl">ℹ️</span>
            <div>
               <h4 className="font-black text-blue-900 uppercase text-sm tracking-widest">Media Library Purpose</h4>
               <p className="text-sm text-blue-800/80 leading-relaxed mt-2">
                 The Media Library serves as your digital filing cabinet for all rental-related assets. Use it to keep vehicle photos, 
                 customer driving licenses, and signed rental agreements organized. <strong>Note:</strong> In this local preview, 
                 files are stored in your browser session. For production, these would sync to <strong>Supabase Storage</strong>.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
