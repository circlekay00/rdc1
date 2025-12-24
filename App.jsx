import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { 
  Search, 
  Plus, 
  Settings, 
  LogOut, 
  Shield, 
  Database, 
  Trash2, 
  Upload, 
  X,
  ChevronRight,
  User,
  Inbox,
  Loader2
} from 'lucide-react';

// --- Firebase Configuration ---
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'rdc1-df539';

// Simple CSV Parser (Handles quoted values and multiple lines)
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/['"]+/g, ''));
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || "";
      return obj;
    }, {});
  });
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('search');
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [registryData, setRegistryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [newItem, setNewItem] = useState({ name: '', type: '', id: '', status: 'Active' });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenErr) {
            await attemptAnonymous();
          }
        } else {
          await attemptAnonymous();
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };

    const attemptAnonymous = async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
      } catch (err) {
        console.warn("Anonymous access limited.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser && !currentUser.isAnonymous);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'registry');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      setRegistryData(docs);
    }, (err) => {
      console.error("Database connection error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error("Login failed");
    }
  };

  const handleLogout = () => signOut(auth);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'registry');
      await addDoc(colRef, { ...newItem, timestamp: Date.now() });
      setShowAddModal(false);
      setNewItem({ name: '', type: '', id: '', status: 'Active' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registry', docId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const data = parseCSV(text);
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'registry');
        
        // Use batches for efficiency
        const batch = writeBatch(db);
        data.forEach((row) => {
          if (row.name) {
            const newDocRef = doc(colRef);
            batch.set(newDocRef, {
              name: row.name,
              type: row.type || "Standard",
              id: row.id || "N/A",
              status: row.status || "Active",
              timestamp: Date.now()
            });
          }
        });
        
        await batch.commit();
        setShowImportModal(false);
      } catch (err) {
        console.error("Import failed:", err);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return registryData.filter(item => 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, registryData]);

  if (loading) return <div className="loading-screen">Syncing Registry...</div>;

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="header-content">
          <div className="logo-section">
            <Database size={20} className="yellow" />
            <span className="logo-text">
              <span className="amber">Gemini</span>Hub <span className="yellow">Registry</span>
            </span>
          </div>

          <div className="nav-pills">
            <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}>Search</button>
            <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Management</button>
          </div>

          <div className="user-section">
            {isAdmin ? (
              <button onClick={handleLogout} className="secondary-btn">
                <LogOut size={14} /> {user.email?.split('@')[0]}
              </button>
            ) : (
              <div className="status-item" style={{fontSize: '10px', opacity: 0.6}}>
                <Shield size={12} /> {user ? 'NODE ACTIVE' : 'CONNECTING...'}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="content">
        {view === 'search' ? (
          <section className="search-view">
            <div className="hero">
              <h1>Global Database</h1>
              <p className="subtitle">Instant identification & tracking system</p>
            </div>
            <div className="search-bar">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Search by name, type, or serial ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={`grid ${searchQuery ? 'visible' : ''}`} style={{marginTop: '40px'}}>
              {filteredResults.map((item) => (
                <div key={item.docId} className="card">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                    <div>
                      <span className="badge">{item.type}</span>
                      <h3 style={{margin: '8px 0', fontSize: '18px'}}>{item.name}</h3>
                    </div>
                    <ChevronRight size={16} className="text-secondary" />
                  </div>
                  <div className="card-footer">
                    <div>
                      <label>Serial ID</label>
                      <p className="mono">{item.id}</p>
                    </div>
                    <div>
                      <label>Status</label>
                      <p style={{color: item.status === 'Active' ? '#4ade80' : '#f87171'}}>{item.status}</p>
                    </div>
                  </div>
                </div>
              ))}
              {searchQuery && filteredResults.length === 0 && (
                <div style={{gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '60px 20px'}}>
                  <Inbox size={48} strokeWidth={1} style={{opacity: 0.3, margin: '0 auto 16px'}} />
                  <h3 style={{color: 'white', marginBottom: '4px'}}>No matches found</h3>
                  <p style={{fontSize: '13px'}}>No entries match your search query.</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="admin-view">
            {!isAdmin ? (
              <div className="login-card">
                <Shield size={40} className="yellow" style={{marginBottom: '20px'}} />
                <h2>Admin Login</h2>
                <form onSubmit={handleLogin}>
                  <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                  <div className="input-group"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                  <button type="submit" className="primary-btn">Authenticate</button>
                </form>
              </div>
            ) : (
              <div className="dashboard">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '32px'}}>
                  <div><h1>Registry Management</h1><p className="subtitle" style={{textAlign: 'left'}}>Update and manage global records</p></div>
                  <div style={{display: 'flex', gap: '12px'}}>
                    <button className="secondary-btn" onClick={() => setShowImportModal(true)}><Upload size={14} /> Import CSV</button>
                    <button className="primary-btn" style={{width: 'auto', padding: '12px 24px'}} onClick={() => setShowAddModal(true)}><Plus size={18} /> New Entry</button>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Type</th><th>ID</th><th>Status</th><th className="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {registryData.map((item) => (
                        <tr key={item.docId}>
                          <td style={{fontWeight: 700}}>{item.name}</td>
                          <td><span className="badge">{item.type}</span></td>
                          <td className="mono">{item.id}</td>
                          <td style={{color: item.status === 'Active' ? '#4ade80' : '#f87171'}}>{item.status}</td>
                          <td className="text-right">
                            <button onClick={() => handleDelete(item.docId)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {registryData.length === 0 && !isImporting && (
                    <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                      Registry empty. Import a CSV or add an entry manually.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add New Record</h2>
            <form onSubmit={handleAddItem}>
              <div className="input-group"><label>Name</label><input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
              <div className="row">
                <div className="input-group"><label>Type</label><input type="text" placeholder="e.g. Asset" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})} /></div>
                <div className="input-group"><label>Serial ID</label><input type="text" placeholder="e.g. SN-001" value={newItem.id} onChange={e => setNewItem({...newItem, id: e.target.value})} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" style={{flex: 2}}>Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal wide">
            <h2>Excel Import (CSV)</h2>
            <p style={{fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '24px'}}>
              Save your Excel file as <b>CSV (Comma delimited)</b>. Headers should include: <code>name</code>, <code>type</code>, <code>id</code>, <code>status</code>.
            </p>
            {isImporting ? (
              <div style={{textAlign: 'center', padding: '40px'}}>
                <Loader2 size={32} className="yellow spin" style={{margin: '0 auto 16px', display: 'block'}} />
                <p>Writing to database...</p>
              </div>
            ) : (
              <label className="dropzone">
                <Upload size={32} className="yellow" style={{marginBottom: '12px', display: 'block', margin: '0 auto'}} />
                <span style={{fontWeight: 700}}>Select CSV File</span>
                <input type="file" accept=".csv" hidden onChange={handleFileUpload} />
              </label>
            )}
            {!isImporting && <button className="cancel-btn" style={{width: '100%', marginTop: '12px'}} onClick={() => setShowImportModal(false)}>Close</button>}
          </div>
        </div>
      )}

      <footer className="status-footer">
        <div className="status-item"><Database size={12} className="yellow" /><span>Synced</span></div>
        <div className="status-item divider"><span>Records: {registryData.length}</span></div>
      </footer>
    </div>
  );
}