import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  signInWithCustomToken
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
  serverTimestamp
} from 'firebase/firestore';
import { 
  Search, Plus, Edit3, Trash2, ShieldCheck, 
  Activity, Box, LogIn, LogOut, Database
} from 'lucide-react';

// Firebase Configuration
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'rdc1';

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&display=swap');

    :root {
      --bg: #0d1b2a;
      --card: #1b263b;
      --accent-blue: #4cc9f0;
      --accent-orange: #ff9f1c;
      --text-primary: #e0e1dd;
      --text-secondary: #778da9;
      --success: #00ff9c;
      --danger: #ff4d4f;
      --warning: #ffd166;
      --border: #2b3a50;
      --font-sans: 'Josefin Sans', sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-sans);
      background-color: var(--bg);
      color: var(--text-primary);
      overflow-x: hidden;
    }

    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 12px;
      min-height: 100vh;
    }

    .header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      background: rgba(27, 38, 59, 0.85);
      backdrop-filter: blur(12px);
      padding: 16px 20px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      position: sticky;
      top: 12px;
      z-index: 100;
    }

    @media (min-width: 768px) {
      .header { flex-direction: row; align-items: center; justify-content: space-between; }
    }

    .brand {
      font-size: 1.5rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
      user-select: none;
    }

    .brand .store { color: var(--accent-orange); }
    .brand .checklist { color: var(--accent-blue); }

    .nav-group { display: flex; gap: 8px; flex-wrap: wrap; }

    .nav-btn {
      padding: 8px 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(65,90,119,0.35);
      color: white;
      cursor: pointer;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      font-family: inherit;
    }

    .nav-btn.active { background: var(--accent-blue); color: var(--bg); }
    .nav-btn.primary { background: var(--accent-blue); color: var(--bg); }
    .nav-btn.success { background: var(--success); color: var(--bg); }
    .nav-btn.danger { background: var(--danger); color: var(--bg); }
    .nav-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
    .nav-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .card {
      background: var(--card);
      padding: 24px;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.05);
      max-width: 100%;
      margin-bottom: 20px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    @media (min-width: 640px) {
      .form-grid { grid-template-columns: 1fr 1fr; }
    }

    .input-wrapper { display: flex; flex-direction: column; gap: 4px; }
    .input-label { font-size: 0.85rem; color: var(--accent-blue); margin-bottom: 6px; font-weight: 600; }
    .input-field {
      width: 100%;
      padding: 12px 16px;
      border-radius: 14px;
      border: 2px solid rgba(255,255,255,0.1);
      background: rgba(13,27,42,0.55);
      color: white;
      font-family: inherit;
      outline: none;
    }
    .input-field:focus { border-color: var(--accent-blue); }

    .admin-dashboard {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    @media (min-width: 640px) { .admin-dashboard { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .admin-dashboard { grid-template-columns: repeat(3, 1fr); } }

    .report-box {
      background: var(--card);
      border-radius: 18px;
      padding: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.2s;
    }
    .report-box:hover { border-color: var(--accent-blue); }

    .report-box h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .report-box p { font-size: 0.85rem; font-family: monospace; color: var(--text-secondary); }
    .report-box .category { font-size: 0.75rem; color: var(--accent-orange); font-weight: 700; text-transform: uppercase; }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 200;
    }

    .loader-screen {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 15px;
      align-items: center;
      justify-content: center;
      color: var(--accent-blue);
      font-weight: 700;
      font-size: 1.25rem;
    }

    .status { margin-top: 6px; font-size: 0.85rem; text-align: center; }
    .status.error { color: var(--danger); }
    .status.info { color: var(--accent-blue); }

    .search-bar {
      margin-bottom: 24px;
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }
    .search-input {
      padding-left: 48px;
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;
      border: 2px dashed rgba(255,255,255,0.05);
      border-radius: 24px;
      color: var(--text-secondary);
    }
  `}</style>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('search'); 
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Single sources of truth for search
  const [searchTerm, setSearchTerm] = useState('');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');

  const [authError, setAuthError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [itemForm, setItemForm] = useState({ description: '', category: '', upc: '', itemNumber: '' });

  // AUTH LOGIC
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenErr) {
            console.warn("Custom token failed:", tokenErr);
          }
        }
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // DATA FETCHING
  useEffect(() => {
    const dataRef = collection(db, 'artifacts', appId, 'public', 'data', 'gemini');
    const unsubscribe = onSnapshot(query(dataRef), 
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setItems(data);
      },
      (err) => console.warn("Firestore access error.")
    );
    return () => unsubscribe();
  }, []);

  /**
   * ROBUST SEARCH FILTER
   * Returns empty array if no search term.
   * Uses safe string casting and try-catch to prevent page crashes.
   */
  const getFilteredItems = (queryText) => {
    const normalizedQuery = (queryText || "").toString().toLowerCase().trim();
    if (!normalizedQuery || normalizedQuery.length === 0) return [];
    
    return items.filter(item => {
      try {
        if (!item) return false;
        const desc = (item.description || "").toString().toLowerCase();
        const num = (item.itemNumber || "").toString().toLowerCase();
        const upc = (item.upc || "").toString().toLowerCase();
        
        return desc.includes(normalizedQuery) || 
               num.includes(normalizedQuery) || 
               upc.includes(normalizedQuery);
      } catch (e) {
        return false; // Skip corrupted items rather than crashing
      }
    });
  };

  const filteredItems = useMemo(() => getFilteredItems(searchTerm), [searchTerm, items]);
  const adminFilteredItems = useMemo(() => getFilteredItems(adminSearchTerm), [adminSearchTerm, items]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setView('admin');
    } catch (e) {
      setAuthError("Login failed. Check credentials.");
    }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (!user) return;
    const data = { 
      description: itemForm.description || "",
      category: itemForm.category || "",
      upc: itemForm.upc || "",
      itemNumber: itemForm.itemNumber || "",
      updatedAt: serverTimestamp() 
    };
    try {
      const colPath = ['artifacts', appId, 'public', 'data', 'gemini'];
      if (editingItem) {
        await updateDoc(doc(db, ...colPath, editingItem.id), data);
      } else {
        await addDoc(collection(db, ...colPath), { ...data, createdAt: serverTimestamp() });
      }
      closeModal();
    } catch (err) {
      console.error("Write error:", err);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setItemForm({ description: '', category: '', upc: '', itemNumber: '' });
  };

  if (loading) return (
    <div className="loader-screen">
      <GlobalStyles />
      <Activity className="animate-spin" size={32} />
      INITIALIZING SECURE LINK...
    </div>
  );

  return (
    <div className="app-container">
      <GlobalStyles />
      
      <header className="header">
        <div className="brand" onClick={() => setView('search')} style={{cursor: 'pointer'}}>
          <Box className="checklist" />
          <span>CK <span className="store">RDC</span></span>
        </div>
        
        <div className="nav-group">
          <button className={`nav-btn ${view === 'search' ? 'active' : ''}`} onClick={() => setView('search')}>
            <Search size={18} /> SEARCH
          </button>
          <button className={`nav-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
            <ShieldCheck size={18} /> ADMIN
          </button>
          {user && (
            <button className="nav-btn danger" onClick={() => signOut(auth)}>
              <LogOut size={18} /> LOGOUT
            </button>
          )}
        </div>
      </header>

      <main>
        {view === 'search' ? (
          <div className="card">
            <div className="search-bar">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                className="input-field search-input" 
                placeholder="Search description, item#, or UPC..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {searchTerm.trim().length > 0 ? (
              <div className="admin-dashboard">
                {filteredItems.map(item => (
                  <div key={item.id} className="report-box">
                    <div className="category">{item.category || 'General'}</div>
                    <h3>{item.description}</h3>
                    <div style={{marginTop: 'auto'}}>
                      <p>ITEM: {item.itemNumber || '---'}</p>
                      <p>UPC: {item.upc || '---'}</p>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="status info" style={{gridColumn: '1 / -1', padding: '40px'}}>
                    No results found for "{searchTerm}"
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <Search size={40} style={{opacity: 0.2, marginBottom: '15px'}} />
                <p style={{fontSize: '1.1rem', fontWeight: 600}}>Inventory Query Ready</p>
                <p style={{fontSize: '0.85rem', opacity: 0.7}}>Start typing above to search the database</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{maxWidth: '900px', margin: '0 auto'}}>
            {!user ? (
              <form onSubmit={handleLogin} className="form-grid" style={{gridTemplateColumns: '1fr', maxWidth: '400px', margin: '0 auto'}}>
                <div style={{textAlign: 'center', marginBottom: '10px'}}>
                  <h2 style={{fontSize: '1.5rem', marginBottom: '4px'}}>Admin Console</h2>
                  <p className="status info">Log in to manage records</p>
                </div>
                {authError && <div className="status error">{authError}</div>}
                <div className="input-wrapper">
                  <label className="input-label">Email</label>
                  <input type="email" required className="input-field" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Password</label>
                  <input type="password" required className="input-field" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                </div>
                <button type="submit" className="nav-btn primary" style={{justifyContent: 'center', padding: '14px', marginTop: '10px'}}>
                  <LogIn size={18} /> ACCESS SYSTEM
                </button>
              </form>
            ) : (
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '24px'}}>
                  <div>
                    <h2 style={{fontSize: '1.5rem'}}>Directory Manager</h2>
                    <p style={{fontSize: '0.75rem', color: 'var(--accent-orange)'}}>Authenticated: {user.email}</p>
                  </div>
                  <button className="nav-btn success" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> NEW RECORD
                  </button>
                </div>

                <div className="search-bar">
                  <Search className="search-icon" size={18} />
                  <input 
                    type="text" 
                    className="input-field search-input" 
                    placeholder="Search database records..." 
                    value={adminSearchTerm}
                    onChange={e => setAdminSearchTerm(e.target.value)}
                  />
                </div>

                {adminSearchTerm.trim().length > 0 ? (
                  <div className="admin-dashboard" style={{gridTemplateColumns: '1fr'}}>
                    {adminFilteredItems.map(item => (
                      <div key={item.id} className="report-box" style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '15px'}}>
                        <div style={{flex: 1}}>
                          <div className="category">{item.category}</div>
                          <h3 style={{fontSize: '1rem'}}>{item.description}</h3>
                          <p style={{fontSize: '0.75rem'}}>ID: {item.itemNumber} | UPC: {item.upc}</p>
                        </div>
                        <div className="nav-group">
                          <button className="nav-btn" onClick={() => { setEditingItem(item); setItemForm(item); setShowModal(true); }}>
                            <Edit3 size={16}/>
                          </button>
                          <button className="nav-btn danger" onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gemini', item.id))}>
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                    ))}
                    {adminFilteredItems.length === 0 && (
                      <div className="status info" style={{padding: '20px'}}>No matching records found.</div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Database size={40} style={{opacity: 0.2, marginBottom: '15px'}} />
                    <p>Enter a search term to edit database entries</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="card" style={{width: '100%', maxWidth: '500px'}}>
            <h3 style={{marginBottom: '20px', fontSize: '1.25rem'}}>{editingItem ? 'Edit Record' : 'Add New Record'}</h3>
            <form onSubmit={saveItem}>
              <div className="form-grid">
                <div className="input-wrapper" style={{gridColumn: '1 / -1'}}>
                  <label className="input-label">Description</label>
                  <textarea required className="input-field" rows="3" value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Category</label>
                  <input type="text" className="input-field" value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Item #</label>
                  <input type="text" className="input-field" value={itemForm.itemNumber} onChange={e => setItemForm({...itemForm, itemNumber: e.target.value})} />
                </div>
                <div className="input-wrapper" style={{gridColumn: '1 / -1'}}>
                  <label className="input-label">UPC</label>
                  <input type="text" className="input-field" value={itemForm.upc} onChange={e => setItemForm({...itemForm, upc: e.target.value})} />
                </div>
              </div>
              <div className="nav-group" style={{justifyContent: 'flex-end', marginTop: '20px'}}>
                <button type="button" className="nav-btn" onClick={closeModal}>CANCEL</button>
                <button type="submit" className="nav-btn success">SAVE RECORD</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer style={{marginTop: '40px', paddingBottom: '30px', textAlign: 'center', opacity: 0.3, fontSize: '0.75rem', letterSpacing: '1px'}}>
        <p>CK RDC SYSTEM V3.0 | LIVE RECORDS: {items.length}</p>
      </footer>
    </div>
  );
}