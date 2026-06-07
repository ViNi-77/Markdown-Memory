import React, { useState, useEffect, useRef } from 'react';
import { Folder, MarkdownDocument } from './types';
import { subscribeToFolders, createFolder, deleteFolder, updateFolder, subscribeToDocuments, createDocument, deleteDocument, updateDocument, generateId } from './lib/firestore';
import { FileText, Folder as FolderIcon, Upload, Plus, Trash2, ChevronRight, ChevronDown, LogOut, PencilLine, Download, Edit2, Save, Sparkles, Loader2, Play, PanelRightClose, PanelRightOpen, Activity, LayoutList, ListTodo, MessageSquare, Search, Settings, PenTool, CheckCircle, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<MarkdownDocument[]>([]);
  
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editContent, setEditContent] = useState('');
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiTask, setAiTask] = useState('defect-analysis');
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key') || '';
    setUserApiKey(savedKey);
    setTempApiKey(savedKey);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let unsubscribeFolders: () => void;
    let unsubscribeDocs: () => void;

    try {
      unsubscribeFolders = subscribeToFolders(user.uid, setFolders);
      unsubscribeDocs = subscribeToDocuments(user.uid, setDocuments);
    } catch (error) {
      console.error("Subscription error", error);
    }

    return () => {
      if (unsubscribeFolders) unsubscribeFolders();
      if (unsubscribeDocs) unsubscribeDocs();
    };
  }, [user]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  useEffect(() => {
    const selectedDocument = documents.find(d => d.id === selectedDocumentId);
    if (selectedDocument) {
      setEditContent(selectedDocument.content);
    }
    setIsEditingDoc(false);
    setAiResult('');
  }, [selectedDocumentId, documents]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message: string;
    defaultValue?: string;
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  const [promptValue, setPromptValue] = useState('');

  const showAlert = (title: string, message: string) => {
    setModalState({ isOpen: true, type: 'alert', title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalState({ 
      isOpen: true, 
      type: 'confirm', 
      title, 
      message, 
      onConfirm, 
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false })) 
    });
  };

  const showPrompt = (title: string, message: string, defaultValue: string = '', onConfirm: (value: string) => void) => {
    setPromptValue(defaultValue);
    setModalState({ 
      isOpen: true, 
      type: 'prompt', 
      title, 
      message, 
      defaultValue, 
      onConfirm, 
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false })) 
    });
  };

  const renderModal = () => {
    if (!modalState.isOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{modalState.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{modalState.message}</p>
            
            {modalState.type === 'prompt' && (
              <input
                type="text"
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && modalState.onConfirm) {
                    modalState.onConfirm(promptValue);
                  }
                }}
              />
            )}
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl border-t border-gray-100">
            {modalState.type !== 'alert' && (
              <button
                onClick={modalState.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 bg-gray-100 rounded-md transition-colors"
              >
                キャンセル
              </button>
            )}
            <button
              onClick={() => {
                if (modalState.onConfirm) {
                  modalState.onConfirm(modalState.type === 'prompt' ? promptValue : undefined);
                } else if (modalState.type === 'alert') {
                  setModalState(s => ({ ...s, isOpen: false }));
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => {
    if (!isSettingsOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">設定</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gemini API キー
                </label>
                <input
                  type="password"
                  placeholder="AQ.Ab..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  入力されたキーはブラウザの `localStorage` にのみ保存され、AI処理のリクエスト送信時にのみ使用されます。
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl border-t border-gray-100">
            <button
              onClick={() => {
                setTempApiKey(userApiKey);
                setIsSettingsOpen(false);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 bg-gray-100 rounded-md transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                localStorage.setItem('user_gemini_api_key', tempApiKey.trim());
                setUserApiKey(tempApiKey.trim());
                setIsSettingsOpen(false);
                showAlert('設定保存', 'Gemini API キーを保存しました。');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleCreateFolder = async () => {
    if (!user) return;
    showPrompt('フォルダの作成', 'フォルダ名を入力してください:', '', async (name) => {
      if (name && name.trim()) {
        const newFolder: Folder = {
          id: generateId(),
          name: name.trim(),
          parentId: null,
          createdAt: Date.now(),
        };
        await createFolder(user.uid, newFolder);
      }
      setModalState(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleRenameFolder = async (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    showPrompt('フォルダ名の変更', '新しいフォルダ名を入力してください（キャンセルの場合は空のまま）:', folder.name, async (newName) => {
      if (newName && newName.trim() && newName.trim() !== folder.name) {
        await updateFolder(user.uid, { ...folder, name: newName.trim() });
      }
      setModalState(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    showConfirm('フォルダの削除', 'このフォルダと中のファイルをすべて削除してもよろしいですか？', async () => {
      await deleteFolder(user.uid, id);
      
      // Also delete docs in folder
      const folderDocs = documents.filter(d => d.folderId === id);
      for (const doc of folderDocs) {
        await deleteDocument(user.uid, doc.id);
      }
      
      if (selectedFolderId === id) setSelectedFolderId(null);
      if (folderDocs.some(d => d.id === selectedDocumentId)) {
        setSelectedDocumentId(null);
      }
      setModalState(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    showConfirm('ファイルの削除', 'このファイルを削除してもよろしいですか？', async () => {
      await deleteDocument(user.uid, id);
      if (selectedDocumentId === id) setSelectedDocumentId(null);
      setModalState(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleRenameDoc = async () => {
    const selectedDocument = documents.find(d => d.id === selectedDocumentId);
    if (!selectedDocument || !user) return;
    showPrompt('ファイル名の変更', '新しいファイル名を入力してください（キャンセルの場合は空のまま）:', selectedDocument.name, async (newName) => {
      if (newName && newName.trim() && newName.trim() !== selectedDocument.name) {
        await updateDocument(user.uid, { ...selectedDocument, name: newName.trim() });
      }
      setModalState(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleDownload = () => {
    const selectedDocument = documents.find(d => d.id === selectedDocumentId);
    if (!selectedDocument) return;
    const blob = new Blob([selectedDocument.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedDocument.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleMoveDoc = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDocument = documents.find(d => d.id === selectedDocumentId);
    if (!selectedDocument || !user) return;
    const newFolderId = e.target.value === 'root' ? null : e.target.value;
    await updateDocument(user.uid, { ...selectedDocument, folderId: newFolderId });
  };

  const handleSaveContent = async () => {
    const selectedDocument = documents.find(d => d.id === selectedDocumentId);
    if (!selectedDocument || !user) return;
    await updateDocument(user.uid, { ...selectedDocument, content: editContent });
    setIsEditingDoc(false);
  };

  const handleReplaceContent = async () => {
    const doc = documents.find(d => d.id === selectedDocumentId);
    if (!doc || !user || !aiResult) return;
    await updateDocument(user.uid, { ...doc, content: aiResult });
    if (isEditingDoc) {
      setEditContent(aiResult);
    }
    // Optional: close AI panel or show success
  };

  const handleAppendContent = async () => {
    const doc = documents.find(d => d.id === selectedDocumentId);
    if (!doc || !user || !aiResult) return;
    const newContent = doc.content + '\n\n' + aiResult;
    await updateDocument(user.uid, { ...doc, content: newContent });
    if (isEditingDoc) {
      setEditContent(newContent);
    }
  };

  const handleAiAnalyze = async (taskType: string = aiTask, currentPrompt: string = customPrompt) => {
    const selectedDocument = documents.find(d => d.id === selectedDocumentId);
    if (!selectedDocument) return;

    const savedKey = localStorage.getItem('user_gemini_api_key') || '';
    if (!savedKey) {
      showAlert('APIキー未設定', 'AI機能を利用するには、設定（歯車アイコン）から Gemini API キーを設定してください。');
      setIsAiPanelOpen(true);
      return;
    }

    setIsAiLoading(true);
    setAiResult('');
    
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContent: selectedDocument.content,
          task: taskType,
          customPrompt: currentPrompt,
          apiKey: savedKey
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze');
      }
      
      setAiResult(data.result);
    } catch (err: any) {
      showAlert('AI分析失敗', "AI分析に失敗しました: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleFolderExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || !user) return;

    for (const file of Array.from(files)) {
      const fileNameLower = file.name.toLowerCase();
      if (!fileNameLower.endsWith('.md') && !fileNameLower.endsWith('.markdown') && file.type !== 'text/markdown') {
        showAlert('無効なファイル', `ファイル ${file.name} はマークダウンファイルではありません。`);
        continue;
      }

      const content = await file.text();
      const newDoc: MarkdownDocument = {
        id: generateId(),
        name: file.name,
        content,
        folderId: selectedFolderId,
        createdAt: Date.now(),
      };
      
      try {
        await createDocument(user.uid, newDoc);
        setSelectedDocumentId(newDoc.id);
        
        if (selectedFolderId) {
          setExpandedFolders(prev => {
            const newExpanded = new Set(prev);
            newExpanded.add(selectedFolderId);
            return newExpanded;
          });
        }
      } catch (err: any) {
        showAlert('アップロード失敗', "アップロードに失敗しました: " + err.message);
        console.error(err);
      }
    }
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    processFiles(e.dataTransfer.files);
  };

  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDocument = documents.find(d => d.id === selectedDocumentId);

  if (loadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-900 font-sans">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 text-gray-900 font-sans">
        <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
          <FileText className="w-16 h-16 text-indigo-600 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Markdown Memory</h1>
          <p className="text-gray-500 mb-8 text-center max-w-sm">
            マークダウンファイルをアップロードし、整理してクラウドに安全に保存するためにサインインしてください。
          </p>
          <button 
            onClick={handleSignIn}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            Googleでサインイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {renderModal()}
      {renderSettingsModal()}
      
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-gray-200 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Markdown
            </h1>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setTempApiKey(userApiKey);
                  setIsSettingsOpen(true);
                }} 
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="設定"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={handleSignOut} 
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="サインアウト"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCreateFolder}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" /> フォルダ
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
              <Upload className="w-4 h-4" /> アップロード
            </button>
            <input
              type="file"
              accept=".md,text/markdown"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ファイル名や内容で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {searchQuery ? (
            <div className="space-y-1">
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">検索結果</div>
              {filteredDocuments.length === 0 ? (
                 <div className="text-sm text-gray-500 p-2 text-center">見つかりませんでした</div>
              ) : (
                filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocumentId(doc.id)}
                    className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedDocumentId === doc.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <FileText className={`w-4 h-4 shrink-0 ${selectedDocumentId === doc.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium truncate">{doc.name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <div
                className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${selectedFolderId === null ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setSelectedFolderId(null)}
              >
                <div className="font-medium text-sm flex items-center gap-2">
                  すべてのファイル
                </div>
              </div>

          {folders.map(folder => {
            const folderDocs = documents.filter(d => d.folderId === folder.id);
            const isExpanded = expandedFolders.has(folder.id);
            const isSelected = selectedFolderId === folder.id;

            return (
              <div key={folder.id} className="mb-1">
                <div
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button 
                      onClick={(e) => toggleFolderExpansion(folder.id, e)}
                      className="p-0.5 -ml-0.5 rounded-sm hover:bg-black/5 transition-colors focus:outline-none"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    </button>
                    <FolderIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium truncate">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleRenameFolder(folder, e)} className="p-1 text-gray-400 hover:text-indigo-600 focus:opacity-100 outline-none">
                      <PencilLine className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => handleDeleteFolder(folder.id, e)} className="p-1 text-gray-400 hover:text-red-600 focus:opacity-100 outline-none">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="ml-6 pl-2 border-l border-gray-200 mt-1 space-y-1">
                    {folderDocs.length === 0 ? (
                      <div className="text-xs text-gray-400 italic py-1">空</div>
                    ) : (
                      folderDocs.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocumentId(doc.id)}
                          className={`group flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors ${selectedDocumentId === doc.id ? 'bg-indigo-100 text-indigo-800' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            <FileText className={`w-3.5 h-3.5 shrink-0 ${selectedDocumentId === doc.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="text-sm truncate">{doc.name}</span>
                          </div>
                          <button onClick={(e) => handleDeleteDocument(doc.id, e)} className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Root Level Documents */}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
            {documents.filter(d => !d.folderId).map(doc => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocumentId(doc.id)}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedDocumentId === doc.id ? 'bg-indigo-50 text-indigo-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <FileText className={`w-4 h-4 shrink-0 ${selectedDocumentId === doc.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium truncate">{doc.name}</span>
                </div>
                <button onClick={(e) => handleDeleteDocument(doc.id, e)} className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {selectedDocument ? (
          <>
            <div className="p-6 border-b border-gray-200 mb-0 flex-shrink-0 flex justify-between items-start">
               <div>
                 <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-bold text-gray-900">{selectedDocument.name}</h2>
                   <button onClick={handleRenameDoc} className="text-gray-400 hover:text-indigo-600 outline-none" title="ドキュメント名の変更">
                     <PencilLine className="w-4 h-4" />
                   </button>
                 </div>
                 <p className="text-sm text-gray-500 mt-1">アップロード日時: {format(selectedDocument.createdAt, 'PP p')}</p>
               </div>
               <div className="flex items-center gap-2">
                 <select 
                   value={selectedDocument.folderId || 'root'} 
                   onChange={handleMoveDoc}
                   title="フォルダへ移動"
                   className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                   <option value="root">ルート</option>
                   {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                 </select>
                 <button 
                   onClick={handleDownload}
                   className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                   title="マークダウンファイルをダウンロード"
                 >
                   <Download className="w-5 h-5" />
                 </button>
                 {isEditingDoc ? (
                   <button 
                     onClick={handleSaveContent}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition"
                   >
                     <Save className="w-4 h-4" /> 保存
                   </button>
                 ) : (
                   <button 
                     onClick={() => setIsEditingDoc(true)}
                     className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition"
                   >
                     <Edit2 className="w-4 h-4" /> 編集
                   </button>
                 )}
                 <div className="w-px h-6 bg-gray-300 mx-1"></div>
                 <button 
                   onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isAiPanelOpen ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                   title="AIパネルの切り替え"
                 >
                   <Sparkles className="w-4 h-4" /> AI ✨
                 </button>
                 <button 
                   onClick={(e) => handleDeleteDocument(selectedDocument.id, e)}
                   className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                   title="ドキュメントの削除"
                 >
                   <Trash2 className="w-5 h-5" />
                 </button>
               </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-row">
              <div className="p-6 overflow-y-auto flex-1 h-full border-r border-gray-200">
                {isEditingDoc ? (
                  <div className="max-w-4xl mx-auto h-full min-h-[500px]">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full min-h-[500px] p-4 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 placeholder-gray-400 resize-none"
                      placeholder="マークダウンを入力..."
                    />
                  </div>
                ) : (
                  <div className="prose prose-sm sm:prose-base prose-indigo max-w-4xl mx-auto custom-markdown-styles">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedDocument.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              
              {isAiPanelOpen && (
                <div className="w-[400px] bg-[#131314] flex flex-col h-full flex-shrink-0 font-sans text-gray-200 border-l border-[#282a2c] relative">
                  <div className="flex justify-end p-4 border-b border-[#282a2c] bg-[#1e1f20] backdrop-blur-md sticky top-0 z-10">
                    <button onClick={() => setIsAiPanelOpen(false)} className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-[#333537]">
                      <PanelRightClose className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[#3c4043] scrollbar-track-transparent">
                    {aiResult ? (
                      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-[#8ab4f8] mb-2">
                           <Sparkles className="w-5 h-5" />
                           <span className="font-medium">回答</span>
                        </div>
                        <div className="prose prose-sm xl:prose-base prose-invert prose-p:text-gray-300 prose-headings:text-gray-200 prose-a:text-[#8ab4f8] max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {aiResult}
                          </ReactMarkdown>
                        </div>
                        <div className="flex gap-3 mt-6 pt-4 border-t border-[#282a2c]">
                          <button
                            onClick={handleReplaceContent}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#282a2c] text-gray-300 text-sm font-medium rounded-full hover:bg-[#333537] transition-colors"
                          >
                            <PenTool className="w-4 h-4" /> 本文を置き換える
                          </button>
                          <button
                            onClick={handleAppendContent}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#8ab4f8] text-[#131314] text-sm font-medium rounded-full hover:bg-[#aecbfa] transition-colors"
                          >
                            <Plus className="w-4 h-4" /> 末尾に追記
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center my-auto min-h-[400px]">
                        <div className="mb-10">
                           <h2 className="text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#4285f4] via-[#ea4335] to-[#fbbc04] mb-3 leading-tight tracking-tight">
                             こんにちは、{user?.displayName ? user.displayName.split(' ')[0] : 'ゲスト'} さん
                           </h2>
                           <h2 className="text-3xl font-medium text-[#c4c7c5] leading-tight tracking-tight">
                             ご用件をお聞かせください。
                           </h2>
                        </div>
                      </div>
                    )}
                    
                    {isAiLoading && (
                       <div className="absolute inset-0 bg-[#131314]/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-[#8ab4f8]" />
                            <p className="text-sm text-gray-400">分析中...</p>
                          </div>
                       </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-[#131314]">
                     <div className="relative bg-[#1e1f20] rounded-[24px] focus-within:bg-[#282a2c] transition-colors pl-4 pr-14 py-3 min-h-[60px] flex items-end">
                       <textarea
                         value={customPrompt}
                         onChange={(e) => setCustomPrompt(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             if (customPrompt.trim() && !isAiLoading) {
                               setAiTask('custom');
                               handleAiAnalyze('custom', customPrompt);
                             }
                           }
                         }}
                         className="w-full bg-transparent text-[15px] text-[#e3e3e3] placeholder-[#c4c7c5] focus:outline-none resize-none leading-relaxed"
                         placeholder="ドキュメントについて質問する..."
                         rows={customPrompt.split('\n').length > 1 ? Math.min(customPrompt.split('\n').length, 5) : 1}
                         style={{ minHeight: '24px' }}
                       />
                       <button
                         onClick={() => {
                           if (customPrompt.trim() && !isAiLoading) {
                             setAiTask('custom');
                             handleAiAnalyze('custom', customPrompt);
                           }
                         }}
                         disabled={isAiLoading || !customPrompt.trim()}
                         className="absolute right-2 bottom-2 w-10 h-10 flex items-center justify-center rounded-full bg-transparent text-[#8ab4f8] hover:bg-[#333537] disabled:opacity-50 disabled:bg-transparent disabled:text-gray-600 transition-colors"
                       >
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                       </button>
                     </div>
                     <p className="text-center text-[11px] text-gray-500 mt-3">
                       AI は不正確な情報を表示することがあります。
                     </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-24 h-24 mb-6 rounded-full bg-gray-50 flex items-center justify-center">
               <Upload className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900">ドキュメントが選択されていません</p>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
              サイドバーからドキュメントを選択するか、ここにファイルをドラッグ＆ドロップしてアップロードしてください。
            </p>
            <div className="mt-8">
               <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-md shadow-sm transition-colors"
                >
                  ファイルを選択
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

