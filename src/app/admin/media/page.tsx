'use client';
import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { MediaFile, uploadMediaFile, fetchMediaFiles, deleteMediaFile, updateMediaTags, formatFileSize } from "@/lib/media-service";
import { Search, Upload, Trash2, Tag, X, Image, Check, AlertTriangle, Ghost } from "lucide-react";

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filter, setFilter] = useState('all'); // all, image, video, unused
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mediaData, vehSnap] = await Promise.all([
        fetchMediaFiles(),
        getDocs(collection(db!, 'vehicles'))
      ]);
      setFiles(mediaData);
      setVehicles(vehSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const usedUrls = useMemo(() => {
    const urls = new Set<string>();
    vehicles.forEach(v => {
      if (v.image_url) urls.add(v.image_url);
      if (Array.isArray(v.gallery)) v.gallery.forEach((url: string) => urls.add(url));
    });
    return urls;
  }, [vehicles]);

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // Type filter
      let matchesType = true;
      if (filter === 'unused') {
        matchesType = !usedUrls.has(file.url);
      } else if (filter !== 'all') {
        matchesType = file.type.startsWith(filter);
      }

      // Search filter
      const matchesSearch = !searchQuery ||
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        
      return matchesType && matchesSearch;
    });
  }, [files, filter, searchQuery, usedUrls]);

  const stats = useMemo(() => {
    const unused = files.filter(f => !usedUrls.has(f.url));
    return {
      total: files.length,
      images: files.filter(f => f.type.startsWith("image/")).length,
      size: files.reduce((s, f) => s + f.size, 0),
      unused: unused.length
    };
  }, [files, usedUrls]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    if (!input.files || input.files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const file = input.files[0];

    try {
      await uploadMediaFile(file, undefined, (progress) => {
        setUploadProgress(Math.round(progress));
      });
      await loadData();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      input.value = "";
    }
  }

  async function handleDelete(id: string, fullPath: string) {
    if (!confirm("Delete this file? This action cannot be undone.")) return;
    try {
      await deleteMediaFile(id, fullPath);
      await loadData();
      setSelectedFile(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete file.");
    }
  }

  async function handleBulkDeleteUnused() {
    const unused = files.filter(f => !usedUrls.has(f.url));
    if (unused.length === 0) return;
    if (!confirm(`Delete ALL ${unused.length} unused files? This cannot be undone.`)) return;

    setLoading(true);
    try {
      await Promise.all(unused.map(f => deleteMediaFile(f.id, f.fullPath)));
      await loadData();
      alert(`Successfully deleted ${unused.length} unused files.`);
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert("Some files failed to delete.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTags() {
    if (!selectedFile) return;
    const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    await updateMediaTags(selectedFile.id, tags);
    setEditingTags(false);
    await loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Media Library</h1>
          <p className="text-slate-600">Centralized storage for all system assets and vehicle imagery.</p>
        </div>
        <div className="flex gap-3">
          {stats.unused > 0 && (
            <button 
              onClick={handleBulkDeleteUnused}
              className="px-6 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clean Unused ({stats.unused})
            </button>
          )}
          <label
            htmlFor="media-upload"
            className={`px-8 py-3 text-white rounded-xl font-bold shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 ${
              uploading ? "bg-slate-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800"
            }`}
          >
            <input type="file" id="media-upload" className="hidden" accept="image/*,video/*,application/pdf" onChange={handleUpload} disabled={uploading} />
            {uploading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Upload className="w-5 h-5" />}
            {uploading ? `Uploading ${uploadProgress}%` : "Upload Asset"}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Assets Count</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active Photos</p>
          <p className="text-3xl font-black text-blue-600">{stats.total - stats.unused}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Storage Size</p>
          <p className="text-3xl font-black text-green-700">{formatFileSize(stats.size)}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md ${stats.unused > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Unused Files</p>
          <p className={`text-3xl font-black ${stats.unused > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{stats.unused}</p>
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search filenames or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-none outline-none font-medium text-slate-900"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All Assets' },
            { id: 'image', label: 'Images' },
            { id: 'unused', label: 'Unused' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                filter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
          <div className="animate-spin w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Refreshing library...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Ghost className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">No matching assets</h3>
          <p className="text-slate-500 mt-2 max-w-sm">
            {filter === 'unused' ? "Awesome! No bloated files detected." : "Upload some photos to see them here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredFiles.map(file => {
            const isUnused = !usedUrls.has(file.url);
            return (
              <div
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`group relative bg-slate-50 rounded-3xl overflow-hidden border-2 transition-all cursor-pointer aspect-square ${
                  selectedFile?.id === file.id ? "border-green-500 ring-4 ring-green-500/10" : "border-slate-100 hover:border-slate-200"
                }`}
              >
                {file.type.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-100">📄</div>
                )}

                {isUnused && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                    Unused
                  </div>
                )}

                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setTagInput((file.tags || []).join(", ")); setEditingTags(true); }}
                      className="p-2 bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-xl transition-all"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.fullPath); }}
                      className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-white text-center truncate w-full">{file.name}</p>
                </div>

                {selectedFile?.id === file.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingTags && selectedFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900">Manage Tags</h2>
              <p className="text-slate-500 mt-1">Organize your assets for better searchability.</p>
            </div>
            <div className="p-8">
               <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 aspect-video">
                  <img src={selectedFile.url} alt="" className="w-full h-full object-cover" />
               </div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Comma Separated Tags</label>
               <input
                 autoFocus
                 type="text"
                 value={tagInput}
                 onChange={(e) => setTagInput(e.target.value)}
                 className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none font-bold"
               />
            </div>
            <div className="p-8 bg-slate-50 flex gap-3">
              <button onClick={handleSaveTags} className="flex-1 py-4 bg-green-700 text-white font-black rounded-2xl hover:bg-green-800 transition-all shadow-lg">Save Changes</button>
              <button onClick={() => setEditingTags(false)} className="px-8 py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}