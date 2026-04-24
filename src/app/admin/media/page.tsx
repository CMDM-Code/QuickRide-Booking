'use client';
import { useState, useEffect, useCallback } from "react";
import { MediaFile, uploadMediaFile, fetchMediaFiles, deleteMediaFile, updateMediaTags, formatFileSize } from "@/lib/media-service";
import { Search, Upload, Trash2, Tag, X, Image, Check } from "lucide-react";

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const data = await fetchMediaFiles();
    setFiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

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
      await loadFiles();
      alert("File uploaded successfully to Firebase Storage!");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload file. Check console for details.");
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
      await loadFiles();
      setSelectedFile(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete file.");
    }
  }

  async function handleSaveTags() {
    if (!selectedFile) return;
    const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    await updateMediaTags(selectedFile.id, tags);
    setEditingTags(false);
    await loadFiles();
    const updated = files.find(f => f.id === selectedFile.id);
    if (updated) setSelectedFile({ ...updated, tags });
  }

  function openTagEditor(file: MediaFile) {
    setSelectedFile(file);
    setTagInput((file.tags || []).join(", "));
    setEditingTags(true);
  }

  const filteredFiles = files.filter(file => {
    const matchesType = filter === 'all' || file.type.startsWith(filter);
    const matchesSearch = !searchQuery ||
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const unusedFiles = files.filter(file => {
    // In production, cross-reference with car_models collection
    // For now, files without tags are considered potentially unused
    return (!file.tags || file.tags.length === 0);
  });

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
            accept="image/*,video/*,application/pdf"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label
            htmlFor="media-upload"
            className={`px-6 py-3 text-white rounded-xl font-bold shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 ${
              uploading ? "bg-slate-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Uploading {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Asset
              </>
            )}
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
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Images</p>
          <p className="text-3xl font-black text-blue-600">{files.filter(f => f.type.startsWith("image/")).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Storage Used</p>
          <p className="text-3xl font-black text-green-700">{formatFileSize(files.reduce((s, f) => s + f.size, 0))}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Untagged</p>
          <p className="text-3xl font-black text-amber-600">{unusedFiles.length}</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by filename or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'image', 'video', 'application/pdf'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : f.split('/')[1]?.toUpperCase() || 'FILE'}
            </button>
          ))}
        </div>
      </div>

      {/* Unused Files Warning */}
      {unusedFiles.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Tag className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Untagged Files Detected</p>
            <p className="text-sm text-amber-800 mt-1">
              {unusedFiles.length} file(s) don't have tags. Tag your images to easily find and associate them with car models.
            </p>
          </div>
        </div>
      )}

      {/* Files Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading media files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-center">
          <Image className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-900">No files found</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">
            {searchQuery ? "Try a different search term." : "Upload vehicle photos or documents to start managing your library."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className={`group relative bg-slate-50 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                selectedFile?.id === file.id ? "border-green-500 ring-2 ring-green-200" : "border-slate-100 hover:border-slate-300"
              }`}
              onClick={() => setSelectedFile(file)}
            >
              {file.type.startsWith('image/') ? (
                <img src={file.url} alt={file.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-4xl bg-slate-100">
                  📄
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openTagEditor(file); }}
                    className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                    title="Edit tags"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.fullPath); }}
                    className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[10px] font-black text-white text-center truncate">{file.name}</p>
                </div>
              </div>

              {/* Selected checkmark */}
              {selectedFile?.id === file.id && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Tags indicator */}
              {file.tags && file.tags.length > 0 && (
                <div className="absolute bottom-2 right-2">
                  <span className="px-1.5 py-0.5 bg-green-500/80 text-white text-[8px] font-bold rounded">
                    {file.tags.length}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tag Editor Modal */}
      {editingTags && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Edit Tags</h2>
                <button
                  onClick={() => setEditingTags(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-1">Add comma-separated tags to organize this file</p>
            </div>

            <div className="p-6">
              {selectedFile.type.startsWith('image/') && (
                <img src={selectedFile.url} alt={selectedFile.name} className="w-full h-40 object-cover rounded-xl mb-4" />
              )}
              <p className="text-sm font-semibold text-slate-700 mb-2 truncate">{selectedFile.name}</p>

              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g., mazda, sedan, exterior"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
              />
              <p className="text-xs text-slate-400 mt-2">Separate tags with commas</p>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={handleSaveTags}
                className="flex-1 px-4 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl transition-all"
              >
                Save Tags
              </button>
              <button
                onClick={() => setEditingTags(false)}
                className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-bold text-blue-900 mb-2">💡 Media Library Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Tag your images with car make/model for easy searching</li>
          <li>• Click on a file to select it, then use actions on hover</li>
          <li>• Files are stored in Firebase Storage with metadata in Firestore</li>
          <li>• Delete images from here will remove them from associated car models</li>
        </ul>
      </div>
    </div>
  );
}