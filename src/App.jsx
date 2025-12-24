import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  Search, Plus, Edit3, Trash2, LogOut, ShieldCheck, 
  FileUp, Zap, Activity, Box, Menu, X
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyAL2mCMWL-FO9HEnmoMf5LTDFIVCzoElF8",
  authDomain: "rdc1-df539.firebaseapp.com",
  projectId: "rdc1-df539",
  storageBucket: "rdc1-df539.firebasestorage.app",
  messagingSenderId: "135166712876",
  appId: "1:135166712876:web:340ab0cb557875c24dc589",
  measurementId: "G-MD185MW9QM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'rdc1';

const loadXLSX = () => {
  return new Promise((resolve) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    document.head.appendChild(script);
  });
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('search'); 
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [authError, setAuthError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ loading: false, message: '', type: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [itemForm, setItemForm] = useState({ description: '', category: '', upc: '', itemNumber: '' });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        setAuthError("Guest access restricted.");
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const dataPath = collection(db, 'artifacts', appId, 'public', 'data', 'gemini');
    const unsubscribe = onSnapshot(query(dataPath), 
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => { console.error("Database sync error:", err); }
    );
    return () => unsubscribe();
  }, [user]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return []; 
    
    return items
      .reduce((acc, item) => {
        const desc = String(item.description || "").toLowerCase();
        const itemNum = String(item.itemNumber || "").toLowerCase();
        const upc = String(item.upc || "").toLowerCase();
        
        let score = 0;
        
        if (desc === term || itemNum === term || upc === term) {
          score = 1000;
        } else if (desc.startsWith(term) || itemNum.startsWith(term) || upc.startsWith(term)) {
          score = 500;
        } else if (desc.includes(term) || itemNum.includes(term) || upc.includes(term)) {
          score = 100;
        }
        
        if (score > 0) {
          acc.push({ ...item, score });
        }
        return acc;
      }, [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [searchTerm, items]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setLoginForm({ email: '', password: '' });
      setView('admin');
      setSearchTerm(''); 
    } catch (e) { setAuthError("Invalid credentials."); }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (!user) return;
    const data = { ...itemForm, updatedAt: serverTimestamp() };
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gemini', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gemini'), { ...data, createdAt: serverTimestamp() });
      }
      closeModal();
    } catch (err) { console.error("Save error:", err); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploadStatus({ loading: true, message: 'Reading file...', type: 'info' });
    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          setUploadStatus({ loading: false, message: 'File is empty.', type: 'error' });
          return;
        }
        const batch = writeBatch(db);
        data.forEach(row => {
          const d = doc(collection(db, 'artifacts', appId, 'public', 'data', 'gemini'));
          batch.set(d, {
            description: row['Item Description'] || row['description'] || '',
            category: row['Category'] || row['category'] || 'General',
            upc: row['UPC'] || row['upc'] || '',
            itemNumber: row['Item Number'] || row['itemNumber'] || '',
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
        setUploadStatus({ loading: false, message: 'Import Successful!', type: 'success' });
        setTimeout(() => setShowUploadModal(false), 1500);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setUploadStatus({ loading: false, message: 'Error processing file.', type: 'error' });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setItemForm({ description: '', category: '', upc: '', itemNumber: '' });
  };

  if (loading) return <div className="loading-screen glass-bg">Initializing CK RDC Systems...</div>;

  return (
    <div className="app-container glass-dark">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&display=swap" rel="stylesheet" />
      
      <header className="main-header glass-header">
        <div className="header-content">
          <div className="logo-section">
            <Box className="orange-glow" size={18} />
            <span className="logo-text">CK <span className="accent-orange">RDC</span></span>
          </div>
          
          <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <nav className={`nav-pills ${isMenuOpen ? 'mobile-open' : ''}`}>
            <button onClick={() => { setView('search'); setIsMenuOpen(false); }} className={view === 'search' ? 'active' : ''}>Search</button>
            <button onClick={() => { setView('admin'); setIsMenuOpen(false); }} className={view === 'admin' ? 'active' : ''}>Admin</button>
            {user && !user.isAnonymous && (
              <button onClick={() => { signOut(auth); setView('search'); setIsMenuOpen(false); }} className="logout-btn"><LogOut size={14} /> Logout</button>
            )}
          </nav>
        </div>
      </header>

      <main className="content">
        {view === 'search' ? (
          <div className="search-view">
            <div className="hero">
              <h1 className="gradient-title">Search RDC</h1>
              <p className="subtitle">muhammad.azeem@circlek.com</p>
              <div className="search-bar glass-search">
                <Search className="accent-orange" size={20} />
                <input 
                  type="text"
                  inputMode="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Scan or type identifier..."
                  autoFocus
                />
              </div>
            </div>

            <div className={`grid ${searchTerm.trim().length > 0 ? 'visible' : ''}`}>
              {filteredItems.map(item => (
                <div key={item.id} className="card glass-card">
                  <span className="badge glass-badge green">{item.category || 'General'}</span>
                  <h3 className="card-title">{item.description}</h3>
                  <div className="card-footer glass-footer">
                    <div>
                      <label>Item #</label>
                      <p className="white-text">{item.itemNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label>UPC</label>
                      <p className="white-text">{item.upc || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {searchTerm.trim().length > 0 && filteredItems.length === 0 && (
              <p className="no-results">No matching records found.</p>
            )}
          </div>
        ) : (
          <div className="admin-view">
            {(!user || user.isAnonymous) ? (
              <div className="login-card glass-card">
                <ShieldCheck className="accent-orange" size={48} style={{marginBottom: '15px'}} />
                <h2 className="admin-title">Admin Portal</h2>
                <form onSubmit={handleLogin}>
                  {authError && <div className="error-msg">{authError}</div>}
                  <div className="input-group">
                    <label>Access Email</label>
                    <input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} className="glass-input" />
                  </div>
                  <div className="input-group">
                    <label>Secure Key</label>
                    <input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} className="glass-input" />
                  </div>
                  <button type="submit" className="glass-btn primary full-width">Verify Clearance</button>
                </form>
              </div>
            ) : (
              <div className="admin-panel">
                <div className="admin-header">
                  <h2 className="admin-title-main">Management</h2>
                  <div className="admin-actions">
                    <button onClick={() => setShowUploadModal(true)} className="glass-btn secondary icon-only"><FileUp size={18} /></button>
                    <button onClick={() => setShowModal(true)} className="glass-btn primary"><Plus size={18} /> Add</button>
                  </div>
                </div>

                <div className="search-bar glass-search admin-search">
                  <Search className="accent-yellow" size={20} />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search nodes..."
                  />
                </div>

                {searchTerm.trim().length > 0 ? (
                  <div className="table-wrapper glass-card">
                    <table className="glass-table mobile-stack">
                      <thead>
                        <tr>
                          <th>Entry</th>
                          <th className="hide-mobile">Digital IDs</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map(item => (
                          <tr key={item.id}>
                            <td>
                              <strong className="entry-desc">{item.description}</strong>
                              <span className="badge glass-badge yellow">{item.category}</span>
                              <div className="mobile-ids show-mobile">
                                <span>ID: {item.itemNumber}</span> • <span>UPC: {item.upc}</span>
                              </div>
                            </td>
                            <td className="mono hide-mobile">
                              <div>Item #: {item.itemNumber}</div>
                              <div>UPC: {item.upc}</div>
                            </td>
                            <td className="text-right">
                              <div className="action-row">
                                <button onClick={() => { setEditingItem(item); setItemForm(item); setShowModal(true); }} className="action-icon-btn"><Edit3 size={16} /></button>
                                <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gemini', item.id))} className="action-icon-btn delete"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="search-placeholder glass-card">
                    <Search size={32} className="accent-yellow faded" />
                    <p>Enter search to manage nodes.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {showUploadModal && (
        <div className="modal-overlay glass-blur">
          <div className="modal glass-card">
            <h3 className="modal-title">Bulk Import</h3>
            <div className="dropzone glass-dropzone" onClick={() => !uploadStatus.loading && fileInputRef.current.click()}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .xlsx, .xls" hidden />
              <FileUp size={32} className="accent-green" />
              <p>{uploadStatus.loading ? 'Uploading...' : 'Tap to select file'}</p>
            </div>
            {uploadStatus.message && (
              <p className={`status-text ${uploadStatus.type}`}>{uploadStatus.message}</p>
            )}
            <button onClick={() => setShowUploadModal(false)} className="glass-btn flat full-width">Close</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay glass-blur">
          <div className="modal wide glass-card">
            <h3 className="modal-title">{editingItem ? 'Update Node' : 'Register Node'}</h3>
            <form onSubmit={saveItem}>
              <div className="input-group">
                <label>Description</label>
                <textarea required rows="3" value={itemForm.description} onChange={(e) => setItemForm({...itemForm, description: e.target.value})} className="glass-input" />
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label>Category</label>
                  <input type="text" value={itemForm.category} onChange={(e) => setItemForm({...itemForm, category: e.target.value})} className="glass-input" />
                </div>
                <div className="input-group">
                  <label>Item Number</label>
                  <input type="text" value={itemForm.itemNumber} onChange={(e) => setItemForm({...itemForm, itemNumber: e.target.value})} className="glass-input" />
                </div>
              </div>
              <div className="input-group">
                <label>UPC Code</label>
                <input type="text" value={itemForm.upc} onChange={(e) => setItemForm({...itemForm, upc: e.target.value})} className="glass-input" />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="glass-btn flat">Discard</button>
                <button type="submit" className="glass-btn primary">Save Protocol</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="status-footer glass-footer-main hide-mobile">
        <div className="status-item"><Activity size={10} className="accent-green" /> Network Active</div>
        <div className="status-item divider"><Zap size={10} className="accent-yellow" /> {items.length} Nodes Registered</div>
      </footer>
      
      <style>{`
        :root {
          --bg-dark: #0f172a;
          --glass: rgba(255, 255, 255, 0.05);
          --glass-border: rgba(255, 255, 255, 0.1);
          --orange: #f97316;
          --green: #22c55e;
          --yellow: #facc15;
          --white: #ffffff;
          --text-muted: #94a3b8;
          --safe-top: env(safe-area-inset-top);
        }

        body {
          background-color: var(--bg-dark);
          color: var(--white);
          margin: 0;
          font-family: 'Josefin Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .app-container {
          min-height: 100vh;
          background: radial-gradient(circle at top right, rgba(249, 115, 22, 0.05), transparent),
                      radial-gradient(circle at bottom left, rgba(34, 197, 94, 0.05), transparent);
        }

        .main-header {
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(15px);
          border-bottom: 1px solid var(--glass-border);
          position: sticky;
          top: 0;
          z-index: 100;
          padding-top: var(--safe-top);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
        }

        .mobile-menu-toggle {
          display: none;
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
        }

        .nav-pills { display: flex; gap: 0.5rem; background: var(--glass); padding: 0.25rem; border-radius: 99px; }
        .nav-pills button {
          font-family: 'Josefin Sans', sans-serif;
          background: transparent; border: none; color: var(--text-muted);
          padding: 0.4rem 1rem; border-radius: 99px; cursor: pointer; transition: all 0.2s;
          font-weight: 600; font-size: 0.9rem;
        }
        .nav-pills button.active { background: var(--orange); color: white; }
        .logout-btn { display: flex; align-items: center; gap: 0.5rem; border: 1px solid var(--glass-border) !important; }

        .hero { text-align: center; padding: 2rem 1.25rem 1rem; }
        .gradient-title {
          font-size: 2.5rem; margin: 0; font-weight: 700;
          background: linear-gradient(to right, #fff, var(--orange), #fff);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .subtitle { color: var(--text-muted); margin-top: 0.25rem; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; }

        .glass-search {
          background: var(--glass); border: 1px solid var(--glass-border);
          width: 90%; max-width: 600px; margin: 1.5rem auto; border-radius: 16px;
          display: flex; align-items: center; padding: 0.75rem 1.25rem;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
        }
        .glass-search input {
          font-family: 'Josefin Sans', sans-serif;
          background: transparent; border: none; color: white; width: 100%; margin-left: 0.75rem;
          font-size: 1rem; outline: none;
        }

        .grid { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 1rem; 
          max-width: 1200px; 
          margin: 1rem auto; 
          padding: 0 1.25rem 4rem; 
          opacity: 0; 
          transition: 0.4s ease-out; 
        }
        .grid.visible { opacity: 1; }

        .glass-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 1.25rem; padding: 1.25rem; }
        .card-title { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0; line-height: 1.4; color: #f8fafc; }
        .glass-badge { border-radius: 6px; padding: 0.2rem 0.5rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
        .glass-badge.green { background: rgba(34, 197, 94, 0.1); color: var(--green); border: 1px solid rgba(34, 197, 94, 0.2); }
        .glass-badge.yellow { background: rgba(250, 204, 21, 0.1); color: var(--yellow); border: 1px solid rgba(250, 204, 21, 0.2); }

        .glass-footer { border-top: 1px solid var(--glass-border); padding-top: 0.75rem; display: flex; justify-content: space-between; }
        .glass-footer label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 2px; }
        .white-text { margin: 0; font-weight: 600; font-size: 0.9rem; font-family: monospace; }

        .glass-btn { font-family: 'Josefin Sans', sans-serif; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1.25rem; }
        .glass-btn.primary { background: var(--orange); color: white; }
        .glass-btn.secondary { background: var(--glass); border: 1px solid var(--glass-border); color: var(--white); }
        .glass-btn.flat { background: transparent; color: var(--text-muted); }
        .full-width { width: 100%; }

        .admin-view { max-width: 1000px; margin: 1.5rem auto; padding: 0 1.25rem; }
        .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .admin-title-main { font-size: 1.5rem; margin: 0; font-weight: 700; }
        
        .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 1rem; }
        .glass-table { width: 100%; border-collapse: collapse; }
        .glass-table th { padding: 0.75rem; color: var(--text-muted); border-bottom: 1px solid var(--glass-border); font-size: 0.7rem; text-transform: uppercase; text-align: left; }
        .glass-table td { padding: 1rem 0.75rem; border-bottom: 1px solid var(--glass-border); vertical-align: top; }
        
        .action-row { display: flex; gap: 0.5rem; justify-content: flex-end; }
        .action-icon-btn { background: var(--glass); border: 1px solid var(--glass-border); color: var(--text-muted); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .action-icon-btn.delete:hover { color: #ef4444; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
        .modal { width: 100%; max-height: 90vh; overflow-y: auto; border-radius: 1.5rem 1.5rem 0 0 !important; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .form-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .modal-actions { display: flex; flex-direction: column-reverse; gap: 0.75rem; margin-top: 1.5rem; }

        .show-mobile { display: none; }
        .hide-mobile { display: block; }

        /* Mobile Specific Layout Adjustments */
        @media (max-width: 640px) {
          .mobile-menu-toggle { display: block; }
          .nav-pills { 
            display: none; position: absolute; top: 100%; left: 0; right: 0; 
            background: rgba(15, 23, 42, 0.95); border-radius: 0; flex-direction: column; 
            padding: 1.5rem; border-bottom: 1px solid var(--glass-border); 
          }
          .nav-pills.mobile-open { display: flex; }
          .nav-pills button { width: 100%; padding: 1rem; border-radius: 12px; text-align: left; font-size: 1.1rem; }

          .gradient-title { font-size: 2.2rem; }
          
          .grid { grid-template-columns: 1fr; }
          .admin-header { flex-direction: row; align-items: center; }
          
          .show-mobile { display: block; }
          .hide-mobile { display: none; }
          
          .mobile-ids { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem; font-family: monospace; }
          
          .modal-overlay { align-items: flex-end; }
          .modal { padding-bottom: 2rem; }
        }

        /* Desktop Layout Adjustments */
        @media (min-width: 641px) {
          .grid { grid-template-columns: repeat(2, 1fr); padding: 0 2rem 2rem; }
          .gradient-title { font-size: 3.5rem; }
          .modal-overlay { align-items: center; }
          .modal { width: 450px; border-radius: 1.5rem !important; animation: fadeIn 0.2s; }
          .modal.wide { width: 600px; }
          .form-grid { grid-template-columns: 1fr 1fr; }
          .modal-actions { flex-direction: row; justify-content: flex-end; }
          .icon-only { padding: 0.6rem; }
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        }

        @media (min-width: 1024px) {
          .grid { grid-template-columns: repeat(3, 1fr); }
        }

        .status-footer { 
          position: fixed; bottom: 1rem; right: 1rem; 
          display: flex; gap: 0.75rem; font-size: 0.7rem; 
          background: rgba(15, 23, 42, 0.8); padding: 0.4rem 0.8rem; 
          border-radius: 99px; border: 1px solid var(--glass-border); 
        }
      `}</style>
    </div>
  );
}