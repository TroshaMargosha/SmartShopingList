import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const translations = {
  ru: { 
    title: 'Список покупок', 
    total: 'Итого', 
    newList: 'Новый список', 
    delete: 'Удалить', 
    change: 'Изменить', 
    addPrice: 'Цена', 
    history: 'История цен',
    spending: 'График трат',
    noHistory: 'История пуста',
    noSpending: 'Нет данных о тратах',
    spentOn: 'Потрачено',
    calc: 'Калькулятор'
  },
  fi: { 
    title: 'Ostoslista', 
    total: 'Yhteensä', 
    newList: 'Uusi lista', 
    delete: 'Poista', 
    change: 'Muuta', 
    addPrice: 'Hinta', 
    history: 'Hintahistoria',
    spending: 'Kulutusgraafi',
    noHistory: 'Historia tyhjä',
    noSpending: 'Ei kulutustietoja',
    spentOn: 'Käytetty',
    calc: 'Laskin'
  },
  en: { 
    title: 'Shopping List', 
    total: 'Total', 
    newList: 'New List', 
    delete: 'Delete', 
    change: 'Change', 
    addPrice: 'Price', 
    history: 'Price History',
    spending: 'Spending Chart',
    noHistory: 'Empty history',
    noSpending: 'No spending data',
    spentOn: 'Spent on',
    calc: 'Calculator'
  },
};

export default function App() {
  // Initialize language from localStorage or default to 'ru'
  const [lang, setLang] = useState(() => {
    const savedLang = localStorage.getItem('lang');
    return (savedLang && ['ru', 'fi', 'en'].includes(savedLang)) ? savedLang : 'ru';
  });

  // Initialize theme from localStorage or default to 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme && ['light', 'dark'].includes(savedTheme)) ? savedTheme : 'light';
  });
  
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('shoppingList');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading items:', e);
        return [];
      }
    }
    return [];
  });
  
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [priceModal, setPriceModal] = useState({ item: null, isOpen: false });
  const [priceInput, setPriceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [quickPriceModal, setQuickPriceModal] = useState({ item: null, isOpen: false });
  const [quickPriceInput, setQuickPriceInput] = useState('');
  const [editPriceModal, setEditPriceModal] = useState({ item: null, isOpen: false });
  const [editPriceInput, setEditPriceInput] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);
  const [showSpendingChart, setShowSpendingChart] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcExpression, setCalcExpression] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ item: null, isOpen: false });

  const inputRef = useRef(null);
  const t = translations[lang];

  // Сохранение языка
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  // Сохранение темы
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Сохранение списка
  useEffect(() => {
    localStorage.setItem('shoppingList', JSON.stringify(items));
  }, [items]);

  // Автодополнение
  const getKnownItems = () => {
    const history = JSON.parse(localStorage.getItem('purchaseHistory') || '[]');
    const map = new Map();
    history.forEach(h => {
      if (h.lang === lang && (!map.has(h.name) || map.get(h.name).price < h.price))
        map.set(h.name, { name: h.name, price: h.price, lang: h.lang });
    });
    return Array.from(map.values());
  };

  const handleInputChange = (v) => {
    setInput(v);
    if (v.length < 2) {
      setShowSuggestions(false);
      return;
    }
    const filtered = getKnownItems()
      .filter(k => k.name.toLowerCase().includes(v.toLowerCase()))
      .slice(0, 6);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const selectSuggestion = (k) => {
    const newItem = {
      id: Date.now().toString(),
      name: k.name,
      price: k.price,
      quantity: 1,
      bought: false,
      dateAdded: new Date().toISOString(),
      lang,
    };
    setItems([...items, newItem]);
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const capitalize = (s) => s.trim() ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

  const addItem = (knownPrice) => {
    if (!input.trim()) return;
    const name = capitalize(input);
    const known = getKnownItems().find(k => k.name === name);

    const newItem = {
      id: Date.now().toString(),
      name,
      price: knownPrice ?? known?.price,
      quantity: 1,
      bought: false,
      dateAdded: new Date().toISOString(),
      lang,
    };

    setItems([...items, newItem]);
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const toggleBought = (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // If trying to mark as bought but no price, ask for price first
    if (!item.bought && !item.price) {
      setQuickPriceModal({ item, isOpen: true });
      setQuickPriceInput('');
      return;
    }

    setItems(items.map(i => {
      if (i.id === id) {
        const updated = { ...i, bought: !i.bought };
        if (updated.bought && updated.price) {
          saveToHistory(updated.name, updated.price, updated.dateAdded, updated.lang);
        }
        return updated;
      }
      return i;
    }));
  };

  const saveQuickPrice = () => {
    if (!quickPriceModal.item || !quickPriceInput) return;
    const price = parseFloat(quickPriceInput.replace(',', '.'));
    if (isNaN(price) || price <= 0) return;

    setItems(items.map(i => {
      if (i.id === quickPriceModal.item.id) {
        const updated = { ...i, price, bought: true };
        saveToHistory(updated.name, price, updated.dateAdded, updated.lang);
        return updated;
      }
      return i;
    }));
    setQuickPriceModal({ item: null, isOpen: false });
    setQuickPriceInput('');
  };

  const handlePriceInput = (value) => {
    // Allow only numbers, comma, and dot
    const cleaned = value.replace(/[^\d.,]/g, '');
    setPriceInput(cleaned);
  };

  const handleQuickPriceInput = (value) => {
    // Allow only numbers, comma, and dot
    const cleaned = value.replace(/[^\d.,]/g, '');
    setQuickPriceInput(cleaned);
  };

  const handleQtyInput = (value) => {
    // Allow only whole numbers
    const cleaned = value.replace(/\D/g, '');
    setQtyInput(cleaned);
  };

  const saveToHistory = (name, price, date, lang) => {
    const history = JSON.parse(localStorage.getItem('purchaseHistory') || '[]');
    history.unshift({ name, price, date: date.split('T')[0], lang });
    localStorage.setItem('purchaseHistory', JSON.stringify(history));
  };

  const getHistory = () => {
    const all = JSON.parse(localStorage.getItem('purchaseHistory') || '[]');
    const filtered = all.filter(h => h.lang === lang);
    const unique = [...new Set(filtered.map(h => h.name))];
    return unique.map(name => {
      const last = filtered.find(h => h.name === name);
      return { name, price: last.price, date: last.date };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const confirmDeleteFromHistory = (itemName) => {
    setDeleteConfirmModal({ item: itemName, isOpen: true });
  };

  const deleteFromHistory = () => {
    if (!deleteConfirmModal.item) return;
    
    const itemName = deleteConfirmModal.item;
    const all = JSON.parse(localStorage.getItem('purchaseHistory') || '[]');
    const filtered = all.filter(h => !(h.name === itemName && h.lang === lang));
    localStorage.setItem('purchaseHistory', JSON.stringify(filtered));
    
    // Close modals
    setDeleteConfirmModal({ item: null, isOpen: false });
    
    // Force re-render by closing and reopening if needed
    if (selectedChart === itemName) {
      setSelectedChart(null);
    }
    // Trigger a state update to refresh the history view
    setShowHistory(false);
    setTimeout(() => setShowHistory(true), 0);
  };

  const getPriceHistoryChart = (name) => {
    const all = JSON.parse(localStorage.getItem('purchaseHistory') || '[]');
    return all
      .filter(h => h.name === name && h.lang === lang)
      .reverse()
      .map(h => ({ date: h.date, price: h.price }));
  };

  const getSpendingData = () => {
    const history = JSON.parse(localStorage.getItem('purchaseHistory') || '[]');
    const filtered = history.filter(h => h.lang === lang);

    const dayMap = new Map();

    filtered.forEach(entry => {
      const day = entry.date;
      dayMap.set(day, (dayMap.get(day) || 0) + entry.price);
    });

    return Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const total = items
    .filter(i => i.bought && i.price)
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  const allBought = items.length > 0 && items.every(i => i.bought);

  const startNewList = () => {
    items.forEach(i => i.bought && i.price && saveToHistory(i.name, i.price, i.dateAdded, i.lang));
    setItems([]);
  };

  const openPriceModal = (item) => {
    setPriceModal({ item, isOpen: true });
    setPriceInput(item.price?.toFixed(2) || '');
    setQtyInput(item.quantity.toString());
  };

  const openEditPriceModal = (item) => {
    setEditPriceModal({ item, isOpen: true });
    setEditPriceInput(item.price?.toFixed(2) || '');
  };

  const saveEditPrice = () => {
    if (!editPriceModal.item || !editPriceInput) return;
    const price = parseFloat(editPriceInput.replace(',', '.'));
    if (isNaN(price) || price <= 0) return;

    setItems(items.map(i => i.id === editPriceModal.item.id ? { ...i, price } : i));
    setEditPriceModal({ item: null, isOpen: false });
    setEditPriceInput('');
  };

  const savePriceAndQty = () => {
    if (!priceModal.item) return;
    const price = parseFloat(priceInput.replace(',', '.'));
    const qty = parseInt(qtyInput) || 1;
    if (isNaN(price) || price <= 0) return;

    setItems(items.map(i => {
      if (i.id === priceModal.item.id) {
        return { ...i, price, quantity: qty };
      }
      return i;
    }));
    setPriceModal({ item: null, isOpen: false });
    setPriceInput('');
    setQtyInput('1');
  };

  const evalCalc = () => {
    try {
      setCalcExpression(Function('"use strict";return (' + calcExpression + ')')().toString());
    } catch { }
  };

  return (
    <>
      <div className="app">
        <div className="app-container">
          <header className="header">
            <h1>{t.title}</h1>
            <div className="header-controls">
              <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
                {theme === 'light' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                )}
              </button>
              <div className="lang-flags">
                <span onClick={() => setLang('ru')} title="Русский" className={lang === 'ru' ? 'active' : ''}>RU</span>
                <span onClick={() => setLang('fi')} title="Suomi" className={lang === 'fi' ? 'active' : ''}>FI</span>
                <span onClick={() => setLang('en')} title="English" className={lang === 'en' ? 'active' : ''}>EN</span>
              </div>
            </div>
            <div className="toolbar">
              <button className="tool-btn calc-btn" onClick={() => setShowCalc(true)} title={t.calc}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <line x1="8" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="10" x2="16" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
                <span>{lang === 'ru' ? 'Калькулятор' : lang === 'fi' ? 'Laskin' : 'Calculator'}</span>
              </button>
              <button className="tool-btn history-btn" onClick={() => setShowHistory(true)} title={t.history}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="20" x2="12" y2="10"/>
                  <line x1="18" y1="20" x2="18" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="16"/>
                </svg>
                <span>{lang === 'ru' ? 'История' : lang === 'fi' ? 'Historia' : 'History'}</span>
              </button>
              <button className="tool-btn spending-btn" onClick={() => setShowSpendingChart(true)} title={t.spending}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <span>{lang === 'ru' ? 'Траты' : lang === 'fi' ? 'Kulut' : 'Spending'}</span>
              </button>
            </div>
          </header>

        <div className="add-section">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              value={input}
              placeholder={lang === 'ru' ? 'Добавить товар...' : lang === 'fi' ? 'Lisää tuote...' : 'Add item...'}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  addItem();
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                if (input.length >= 2) {
                  const filtered = getKnownItems()
                    .filter(k => k.name.toLowerCase().includes(input.toLowerCase()))
                    .slice(0, 6);
                  if (filtered.length > 0) {
                    setSuggestions(filtered);
                    setShowSuggestions(true);
                  }
                }
              }}
            />
            <button className="add-btn" onClick={() => addItem()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>{lang === 'ru' ? 'Добавить' : lang === 'fi' ? 'Lisää' : 'Add'}</span>
            </button>
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((s, i) => (
                  <div key={i} onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(s);
                  }}>
                    <span>{s.name}</span>
                    <small>{s.price.toFixed(2)} €</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="list">
            {items.map(item => (
              <div key={item.id} className={`item ${item.bought ? 'bought' : ''}`}>
                <div className="item-main">
                  <span className="name" onClick={() => !item.bought && toggleBought(item.id)}>{item.name}</span>
                  {item.price && (
                    <span 
                      className="price" 
                      onClick={(e) => {
                        if (!item.bought) {
                          e.stopPropagation();
                          openEditPriceModal(item);
                        }
                      }}
                      title={!item.bought ? (lang === 'ru' ? 'Изменить цену' : lang === 'fi' ? 'Muuta hintaa' : 'Change price') : ''}
                    >
                      {(item.price * item.quantity).toFixed(2)} €
                    </span>
                  )}
                </div>
                <div className="item-controls">
                  {!item.bought ? (
                    <>
                      <div className="qty-controls">
                        <button 
                          className="qty-btn" 
                          onClick={() => setItems(items.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                        >−</button>
                        <span className="qty-display">{item.quantity}</span>
                        <button 
                          className="qty-btn" 
                          onClick={() => setItems(items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                        >+</button>
                      </div>
                      <button className="delete" onClick={() => setItems(items.filter(i => i.id !== item.id))}>×</button>
                    </>
                  ) : (
                    <button className="undo-btn" onClick={() => toggleBought(item.id)} title={lang === 'ru' ? 'Отменить' : lang === 'fi' ? 'Peru' : 'Undo'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6"/>
                        <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="total-bar">
              <strong>{t.total}: {total.toFixed(2)} €</strong>
            </div>

            {allBought && (
              <button className="new-list-btn" onClick={startNewList}>{t.newList}</button>
            )}
          </div>
        )}

        {/* Быстрая модалка цены при покупке */}
        {quickPriceModal.isOpen && (
          <div className="modal-overlay" onClick={() => setQuickPriceModal({ item: null, isOpen: false })}>
            <div className="modal price-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{quickPriceModal.item?.name}</h3>
                <button className="close-btn" onClick={() => setQuickPriceModal({ item: null, isOpen: false })}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <p className="modal-subtitle">
                {lang === 'ru' ? 'Введите цену товара' : lang === 'fi' ? 'Syötä tuotteen hinta' : 'Enter item price'}
              </p>
              <div className="input-group">
                <div className="input-with-suffix">
                  <input 
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00" 
                    value={quickPriceInput} 
                    onChange={e => handleQuickPriceInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveQuickPrice()}
                    autoFocus 
                    className="modal-input"
                  />
                  <span className="input-suffix">€</span>
                </div>
              </div>
              <button onClick={saveQuickPrice} className="modal-btn primary">
                {lang === 'ru' ? 'Сохранить' : lang === 'fi' ? 'Tallenna' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Модалка редактирования цены */}
        {editPriceModal.isOpen && (
          <div className="modal-overlay" onClick={() => setEditPriceModal({ item: null, isOpen: false })}>
            <div className="modal price-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editPriceModal.item?.name}</h3>
                <button className="close-btn" onClick={() => setEditPriceModal({ item: null, isOpen: false })}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <p className="modal-subtitle">
                {lang === 'ru' ? 'Изменить цену' : lang === 'fi' ? 'Muuta hintaa' : 'Change price'}
              </p>
              <div className="input-group">
                <div className="input-with-suffix">
                  <input 
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00" 
                    value={editPriceInput} 
                    onChange={e => setEditPriceInput(e.target.value.replace(/[^\d.,]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && saveEditPrice()}
                    autoFocus 
                    className="modal-input"
                  />
                  <span className="input-suffix">€</span>
                </div>
              </div>
              <button onClick={saveEditPrice} className="modal-btn primary">
                {lang === 'ru' ? 'Сохранить' : lang === 'fi' ? 'Tallenna' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Модалка цены и количества */}
        {priceModal.isOpen && (
          <div className="modal-overlay" onClick={() => setPriceModal({ item: null, isOpen: false })}>
            <div className="modal price-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{priceModal.item?.name}</h3>
                <button className="close-btn" onClick={() => setPriceModal({ item: null, isOpen: false })}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <p className="modal-subtitle">
                {lang === 'ru' ? 'Редактировать товар' : lang === 'fi' ? 'Muokkaa tuotetta' : 'Edit item'}
              </p>
              <div className="input-group">
                <label>{lang === 'ru' ? 'Цена' : lang === 'fi' ? 'Hinta' : 'Price'}</label>
                <div className="input-with-suffix">
                  <input 
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00" 
                    value={priceInput} 
                    onChange={e => handlePriceInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && savePriceAndQty()}
                    autoFocus 
                    className="modal-input"
                  />
                  <span className="input-suffix">€</span>
                </div>
              </div>
              <div className="input-group">
                <label>{lang === 'ru' ? 'Количество' : lang === 'fi' ? 'Määrä' : 'Quantity'}</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  placeholder="1" 
                  value={qtyInput} 
                  onChange={e => handleQtyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && savePriceAndQty()}
                  className="modal-input"
                />
              </div>
              <button onClick={savePriceAndQty} className="modal-btn primary">
                {lang === 'ru' ? 'Сохранить' : lang === 'fi' ? 'Tallenna' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* История + график */}
        {showHistory && (
          <div className="modal-overlay" onClick={() => setShowHistory(false)}>
            <div className="history-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t.history}</h3>
                <button className="close-btn" onClick={() => setShowHistory(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-content">
                {getHistory().length === 0 ? (
                  <p className="empty-state">{t.noHistory}</p>
                ) : (
                  <div className="history-grid">
                    {getHistory().map(h => (
                      <div key={h.name} className="hist-card">
                        <div className="hist-card-content" onClick={() => setSelectedChart(h.name)}>
                          <div className="hist-name">{h.name}</div>
                          <div className="hist-price">{h.price.toFixed(2)} €</div>
                        </div>
                        <button 
                          className="hist-delete" 
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteFromHistory(h.name);
                          }}
                          title={lang === 'ru' ? 'Удалить' : lang === 'fi' ? 'Poista' : 'Delete'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedChart && (
          <div className="modal-overlay" onClick={() => setSelectedChart(null)}>
            <div className="chart-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedChart}</h3>
                <button className="close-btn" onClick={() => setSelectedChart(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-content chart-content">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getPriceHistoryChart(selectedChart)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6c757d" />
                    <YAxis stroke="#6c757d" />
                    <Tooltip formatter={(v) => v.toFixed(2) + ' €'} />
                    <Line type="monotone" dataKey="price" stroke="#2A5F8D" strokeWidth={3} dot={{ r: 5, fill: "#A880A0" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* График трат */}
        {showSpendingChart && (
          <div className="modal-overlay" onClick={() => setShowSpendingChart(false)}>
            <div className="chart-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t.spending}</h3>
                <button className="close-btn" onClick={() => setShowSpendingChart(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-content chart-content">
                {getSpendingData().length === 0 ? (
                  <p className="empty-state">{t.noSpending}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={getSpendingData()} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        tick={{ fontSize: 12 }}
                        stroke="#6c757d"
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="#6c757d" />
                      <Tooltip 
                        formatter={(value) => `${value.toFixed(2)} €`}
                        labelFormatter={(label) => `${t.spentOn} ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#E19485" 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: "#C1726F" }}
                        name="€"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Калькулятор */}
        {showCalc && (
          <div className="modal-overlay" onClick={() => setShowCalc(false)}>
            <div className="calc-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t.calc}</h3>
                <button className="close-btn" onClick={() => setShowCalc(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-content calc-content">
                <input 
                  className="calc-display" 
                  value={calcExpression || '0'} 
                  onChange={e => setCalcExpression(e.target.value)} 
                  placeholder="0" 
                />
                <div className="calc-grid">
                  {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'].map(b =>
                    <button 
                      key={b} 
                      className={`calc-btn-key ${['/', '*', '-', '+', '='].includes(b) ? 'operator' : ''}`}
                      onClick={() => b === '=' ? evalCalc() : setCalcExpression(c => c + b)}
                    >
                      {b}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Модалка подтверждения удаления */}
        {deleteConfirmModal.isOpen && (
          <div className="modal-overlay" onClick={() => setDeleteConfirmModal({ item: null, isOpen: false })}>
            <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{lang === 'ru' ? 'Удалить из истории?' : lang === 'fi' ? 'Poista historiasta?' : 'Delete from history?'}</h3>
                <button className="close-btn" onClick={() => setDeleteConfirmModal({ item: null, isOpen: false })}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-content confirm-content">
                <p className="confirm-text">
                  {lang === 'ru' ? (
                    <>Вы уверены, что хотите удалить <strong>"{deleteConfirmModal.item}"</strong> из истории покупок?</>
                  ) : lang === 'fi' ? (
                    <>Haluatko varmasti poistaa <strong>"{deleteConfirmModal.item}"</strong> ostoshistoriasta?</>
                  ) : (
                    <>Are you sure you want to delete <strong>"{deleteConfirmModal.item}"</strong> from purchase history?</>
                  )}
                </p>
                <div className="confirm-buttons">
                  <button className="confirm-btn cancel" onClick={() => setDeleteConfirmModal({ item: null, isOpen: false })}>
                    {lang === 'ru' ? 'Отмена' : lang === 'fi' ? 'Peruuta' : 'Cancel'}
                  </button>
                  <button className="confirm-btn delete" onClick={deleteFromHistory}>
                    {lang === 'ru' ? 'Удалить' : lang === 'fi' ? 'Poista' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }
        
        body {
          margin: 0;
          padding: 0;
          transition: background-color 0.3s ease;
        }
        
        body[data-theme="light"] {
          --bg-gradient-start: #f8f9fa;
          --bg-gradient-end: #e9ecef;
          --card-bg: white;
          --text-primary: #2A5F8D;
          --text-secondary: #6c757d;
          --border-color: #e9ecef;
          --input-bg: #f8f9fa;
          --shadow: rgba(42, 95, 141, 0.15);
          --item-bg: white;
          --item-hover-shadow: rgba(42, 95, 141, 0.15);
        }
        
        body[data-theme="dark"] {
          --bg-gradient-start: #1a1d29;
          --bg-gradient-end: #0f1117;
          --card-bg: #252936;
          --text-primary: #A880A0;
          --text-secondary: #9ca3af;
          --border-color: #3a3f52;
          --input-bg: #1e2230;
          --shadow: rgba(0, 0, 0, 0.3);
          --item-bg: #2d3142;
          --item-hover-shadow: rgba(168, 128, 160, 0.2);
        }
        
        .app { 
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
          min-height: 100vh;
          padding: 12px;
          transition: background 0.3s ease;
        }
        
        .app-container {
          max-width: 600px; 
          margin: 0 auto; 
          background: var(--card-bg);
          border-radius: 20px;
          box-shadow: 0 10px 40px var(--shadow);
          padding: 24px;
          transition: all 0.3s ease;
        }
        
        @media (min-width: 768px) {
          .app {
            padding: 20px;
          }
          
          .app-container {
            padding: 32px;
          }
        }
        
        h1 { 
          margin: 0 0 16px; 
          font-size: 1.6em; 
          color: var(--text-primary);
          font-weight: 700;
          letter-spacing: -0.5px;
          transition: color 0.3s ease;
          text-align: center;
        }
        
        .header { 
          margin-bottom: 20px;
        }
        
        .header-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .theme-toggle {
          width: 40px;
          height: 40px;
          border: none;
          background: var(--input-bg);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 2px solid var(--border-color);
        }
        
        .theme-toggle svg {
          stroke: var(--text-primary);
          transition: all 0.25s ease;
        }
        
        .theme-toggle:hover {
          background: linear-gradient(135deg, #2A5F8D 0%, #A880A0 100%);
          border-color: #2A5F8D;
          transform: rotate(180deg);
        }
        
        .theme-toggle:hover svg {
          stroke: white;
        }
        
        .toolbar {
          display: flex;
          gap: 8px;
          padding: 10px;
          background: var(--input-bg);
          border-radius: 12px;
          flex-wrap: wrap;
          border: 2px solid var(--border-color);
          transition: all 0.3s ease;
        }
        
        .tool-btn {
          flex: 1;
          min-width: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border: none;
          background: var(--card-bg);
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 2px 6px var(--shadow);
          transition: all 0.25s ease;
          font-size: 0.85em;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .tool-btn svg {
          stroke: var(--text-primary);
          transition: all 0.25s ease;
          flex-shrink: 0;
        }
        
        .tool-btn span {
          transition: all 0.25s ease;
          display: none;
        }
        
        @media (min-width: 768px) {
          h1 {
            font-size: 2.2em;
            margin-bottom: 20px;
          }
          
          .header {
            margin-bottom: 28px;
          }
          
          .header-controls {
            margin-bottom: 20px;
          }
          
          .toolbar {
            gap: 10px;
            padding: 12px;
          }
          
          .tool-btn {
            gap: 8px;
            padding: 12px 16px;
            font-size: 0.9em;
          }
          
          .tool-btn span {
            display: inline;
          }
        }
        
        .tool-btn:hover { 
          background: linear-gradient(135deg, #2A5F8D 0%, #A880A0 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(42, 95, 141, 0.2);
          color: white;
        }
        
        .tool-btn:hover svg {
          stroke: white;
        }
        
        .tool-btn:active {
          transform: translateY(0);
        }
        
        .lang-flags { 
          display: flex; 
          gap: 4px; 
          background: #f8f9fa;
          padding: 4px;
          border-radius: 10px;
        }
        
        .lang-flags span { 
          cursor: pointer; 
          font-weight: 700; 
          padding: 6px 10px; 
          border-radius: 8px; 
          background: transparent;
          color: #6c757d;
          transition: all 0.2s ease;
          font-size: 0.8em;
          letter-spacing: 0.5px;
        }
        
        @media (min-width: 768px) {
          .lang-flags {
            gap: 6px;
            padding: 6px;
          }
          
          .lang-flags span {
            padding: 8px 14px;
            font-size: 0.85em;
          }
        }
        
        .lang-flags span.active {
          background: linear-gradient(135deg, #2A5F8D 0%, #A880A0 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(42, 95, 141, 0.3);
        }
        
        .lang-flags span:hover:not(.active) { 
          background: #E19485; 
          color: white;
          transform: translateY(-1px);
        }
        
        .add-section { 
          margin-bottom: 28px; 
        }
        
        .input-wrapper { 
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .input-wrapper input { 
          width: 100%;
          padding: 14px 16px; 
          font-size: 1em; 
          border-radius: 12px; 
          border: 2px solid var(--border-color);
          background: var(--input-bg);
          transition: all 0.25s ease;
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .input-wrapper input:focus {
          outline: none;
          border-color: #A880A0;
          background: var(--card-bg);
          box-shadow: 0 4px 20px rgba(168, 128, 160, 0.15);
        }
        
        .input-wrapper input::placeholder {
          color: var(--text-secondary);
        }
        
        .add-btn { 
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px; 
          border-radius: 12px; 
          background: linear-gradient(135deg, #2A5F8D 0%, #A880A0 100%);
          color: white; 
          font-size: 0.95em;
          font-weight: 700;
          border: none; 
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(42, 95, 141, 0.3);
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        
        .add-btn svg {
          stroke: white;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        
        .add-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(42, 95, 141, 0.4);
        }
        
        .add-btn:hover svg {
          transform: rotate(90deg);
        }
        
        .add-btn:active {
          transform: translateY(-1px);
        }
        
        @media (min-width: 768px) {
          .input-wrapper {
            flex-direction: row;
            gap: 12px;
          }
          
          .input-wrapper input {
            padding: 16px 20px;
            font-size: 1.05em;
          }
          
          .add-btn {
            padding: 16px 28px;
            font-size: 1em;
            gap: 10px;
          }
        }
        
        .suggestions { 
          position: absolute; 
          top: 100%; 
          left: 0; 
          right: 0; 
          background: white; 
          border: 2px solid #A880A0; 
          border-top: none; 
          border-radius: 0 0 12px 12px; 
          z-index: 10;
          box-shadow: 0 8px 16px rgba(168, 128, 160, 0.15);
          animation: slideDown 0.2s ease;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .suggestions > div { 
          padding: 14px; 
          display: flex; 
          justify-content: space-between; 
          cursor: pointer;
          transition: background 0.15s ease;
        }
        
        .suggestions > div:hover { 
          background: #E19485; 
          color: white;
        }
        
        .suggestions > div:hover small {
          color: white;
        }
        
        .list {
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .item { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 12px 14px; 
          margin: 8px 0; 
          background: var(--item-bg);
          border-radius: 12px;
          box-shadow: 0 2px 8px var(--shadow);
          transition: all 0.3s ease;
          animation: slideIn 0.3s ease;
          gap: 8px;
          border: 2px solid var(--border-color);
        }
        
        @media (min-width: 768px) {
          .item {
            padding: 14px 18px;
            margin: 10px 0;
            gap: 12px;
          }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .item:hover:not(.bought) {
          box-shadow: 0 4px 16px var(--item-hover-shadow);
          transform: translateY(-2px);
        }
        
        .item.bought { 
          opacity: 0.6; 
          background: var(--input-bg);
          position: relative;
        }
        
        .item.bought::before {
          content: '';
          position: absolute;
          left: 14px;
          right: 14px;
          top: 50%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #B05857 20%, #B05857 80%, transparent);
          transform: translateY(-50%);
          animation: strikethrough 0.4s ease;
        }
        
        @keyframes strikethrough {
          from { width: 0; left: 50%; right: 50%; }
          to { left: 14px; right: 14px; }
        }
        
        .item-main {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          min-width: 0;
        }
        
        .item.bought .item-main {
          cursor: default;
        }
        
        .name { 
          flex: 1;
          font-size: 1em; 
          padding-right: 8px;
          color: var(--text-primary);
          font-weight: 500;
          transition: color 0.2s ease;
          word-break: break-word;
          min-width: 0;
        }
        
        @media (min-width: 768px) {
          .name {
            font-size: 1.15em;
            padding-right: 12px;
          }
        }
        
        .item:not(.bought) .item-main:hover .name {
          color: #C1726F;
        }
        
        .item-controls { 
          display: flex; 
          align-items: center; 
          gap: 8px;
          flex-shrink: 0;
        }
        
        .qty-controls { 
          display: flex; 
          flex-direction: row;
          align-items: center; 
          gap: 4px; 
          background: var(--input-bg);
          border-radius: 10px; 
          padding: 3px;
          border: 2px solid var(--border-color);
        }
        
        .qty-btn { 
          width: 28px; 
          height: 28px; 
          border: none; 
          background: #A880A0;
          color: white;
          border-radius: 6px; 
          font-size: 1.1em; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          transition: all 0.2s ease;
          font-weight: 700;
          line-height: 1;
        }
        
        .qty-btn:hover { 
          background: #2A5F8D;
          transform: scale(1.1);
        }
        
        .qty-btn:active { 
          transform: scale(0.95);
        }
        
        .qty-display { 
          min-width: 28px; 
          text-align: center; 
          font-weight: 700; 
          font-size: 0.95em;
          color: var(--text-primary);
          padding: 0 4px;
        }
        
        .price { 
          font-weight: 700; 
          color: #B05857;
          font-size: 1em; 
          min-width: 65px; 
          text-align: right;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 4px 8px;
          border-radius: 6px;
        }
        
        .item:not(.bought) .price:hover {
          background: rgba(176, 88, 87, 0.1);
          transform: scale(1.05);
        }
        
        .item.bought .price {
          cursor: default;
        }
        
        .undo-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: linear-gradient(135deg, #E19485 0%, #C1726F 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(225, 148, 133, 0.3);
        }
        
        .undo-btn svg {
          stroke: white;
          transition: all 0.25s ease;
        }
        
        .undo-btn:hover {
          transform: scale(1.1) rotate(-15deg);
          box-shadow: 0 4px 16px rgba(225, 148, 133, 0.5);
        }
        
        .undo-btn:active {
          transform: scale(0.95);
        }
        
        @media (min-width: 768px) {
          .item-controls {
            gap: 12px;
          }
          
          .qty-controls {
            gap: 6px;
            padding: 4px;
          }
          
          .qty-btn {
            width: 32px;
            height: 32px;
            font-size: 1.2em;
          }
          
          .qty-display {
            min-width: 32px;
            font-size: 1.05em;
            padding: 0 6px;
          }
          
          .price {
            font-size: 1.15em;
            min-width: 85px;
          }
          
          .undo-btn {
            width: 44px;
            height: 44px;
          }
        }
        

        .delete { 
          background: none; 
          border: none; 
          font-size: 1.8em; 
          cursor: pointer; 
          color: #B05857;
          padding: 6px;
          transition: all 0.2s ease;
          font-weight: 300;
        }
        
        .delete:hover { 
          transform: scale(1.3) rotate(90deg);
          color: #C1726F;
        }
        
        .total-bar { 
          text-align: center; 
          font-size: 1.6em; 
          margin: 20px 0; 
          font-weight: 700;
          color: var(--text-primary);
          padding: 16px;
          background: var(--item-bg);
          border-radius: 12px;
          box-shadow: 0 4px 16px var(--shadow);
          border: 2px solid var(--border-color);
          transition: all 0.3s ease;
        }
        
        @media (min-width: 768px) {
          .total-bar {
            font-size: 2em;
            margin: 24px 0;
            padding: 20px;
          }
        }
        
        .new-list-btn { 
          width: 100%; 
          padding: 18px; 
          background: linear-gradient(135deg, #E19485 0%, #C1726F 100%);
          color: white; 
          border: none; 
          border-radius: 12px; 
          font-size: 1.2em; 
          cursor: pointer;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(225, 148, 133, 0.3);
          transition: all 0.3s ease;
        }
        
        .new-list-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(225, 148, 133, 0.4);
        }
        
        .new-list-btn:active {
          transform: translateY(0);
        }
        
        .modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(42, 95, 141, 0.7);
          backdrop-filter: blur(4px);
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 100;
          animation: fadeIn 0.2s ease;
        }
        
        .modal, .history-modal, .chart-modal, .calc-modal { 
          position: relative; 
          background: var(--card-bg); 
          padding: 0; 
          border-radius: 20px; 
          width: 92%; 
          max-width: 420px;
          box-shadow: 0 20px 60px var(--shadow);
          animation: modalSlide 0.3s ease;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border: 2px solid var(--border-color);
          transition: all 0.3s ease;
        }
        
        @media (min-width: 768px) {
          .modal, .history-modal, .chart-modal, .calc-modal {
            width: 90%;
          }
        }
        
        @keyframes modalSlide {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 16px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .modal-header h3 {
          color: var(--text-primary);
          margin: 0;
          font-size: 1.4em;
          font-weight: 700;
        }
        
        .close-btn {
          background: var(--input-bg);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .close-btn svg {
          stroke: var(--text-secondary);
          transition: all 0.2s ease;
        }
        
        .close-btn:hover {
          background: #E19485;
          transform: rotate(90deg);
        }
        
        .close-btn:hover svg {
          stroke: white;
        }
        
        .price-modal {
          padding: 0;
        }
        
        .price-modal > p,
        .price-modal > .input-group {
          padding: 0 24px;
        }
        
        .price-modal > .modal-btn {
          margin: 0 24px 24px;
          width: calc(100% - 48px);
        }
        
        .modal-subtitle {
          color: var(--text-secondary);
          font-size: 0.9em;
          margin: 16px 0 20px;
        }
        
        .input-group {
          margin-bottom: 20px;
        }
        
        .input-group label {
          display: block;
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9em;
          margin-bottom: 8px;
        }
        
        .input-with-suffix {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .modal-input { 
          width: 100%; 
          padding: 14px 16px; 
          font-size: 1.1em; 
          border: 2px solid var(--border-color);
          border-radius: 12px;
          transition: all 0.2s ease;
          background: var(--input-bg);
          color: var(--text-primary);
          font-weight: 600;
        }
        
        .input-with-suffix .modal-input {
          padding-right: 40px;
        }
        
        .modal-input:focus {
          outline: none;
          border-color: #A880A0;
          background: var(--card-bg);
          box-shadow: 0 0 0 4px rgba(168, 128, 160, 0.1);
        }
        
        .input-suffix {
          position: absolute;
          right: 16px;
          color: #A880A0;
          font-weight: 700;
          font-size: 1.1em;
        }
        
        .modal-btn { 
          width: 100%; 
          padding: 14px 24px; 
          font-size: 1em; 
          background: linear-gradient(135deg, #2A5F8D 0%, #A880A0 100%);
          color: white; 
          border: none; 
          border-radius: 12px; 
          cursor: pointer;
          font-weight: 700;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(42, 95, 141, 0.2);
          margin-top: 20px;
        }
        
        .modal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(42, 95, 141, 0.35);
        }
        
        .modal-btn:active {
          transform: translateY(0);
        }
        
        @media (min-width: 768px) {
          .modal-btn {
            padding: 16px 24px;
            font-size: 1.05em;
          }
        }
        
        .calc-content {
          padding: 20px;
        }
        
        .calc-display { 
          width: 100%; 
          padding: 20px; 
          font-size: 1.8em; 
          text-align: right; 
          margin-bottom: 20px;
          font-weight: 700;
          color: var(--text-primary);
          background: var(--input-bg);
          border: 2px solid var(--border-color);
          border-radius: 12px;
        }
        
        .calc-display:focus {
          outline: none;
          border-color: #A880A0;
          background: var(--card-bg);
        }
        
        .calc-grid { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 10px; 
        }
        
        .calc-btn-key { 
          padding: 20px; 
          font-size: 1.3em; 
          background: var(--card-bg);
          color: var(--text-primary);
          font-weight: 700;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .calc-btn-key:hover {
          background: #2A5F8D;
          color: white;
          border-color: #2A5F8D;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(42, 95, 141, 0.2);
        }
        
        .calc-btn-key:active {
          transform: translateY(0);
        }
        
        .calc-btn-key.operator {
          background: linear-gradient(135deg, #A880A0 0%, #E19485 100%);
          color: white;
          border-color: #A880A0;
        }
        
        .calc-btn-key.operator:hover {
          background: linear-gradient(135deg, #2A5F8D 0%, #A880A0 100%);
          border-color: #2A5F8D;
        }
        
        .modal-content {
          padding: 24px;
          overflow-y: auto;
          max-height: calc(90vh - 80px);
          flex: 1;
        }
        
        .history-modal .modal-content {
          max-height: calc(90vh - 80px);
        }
        
        .chart-content {
          padding: 20px;
        }
        
        .empty-state {
          text-align: center;
          color: #adb5bd;
          padding: 40px 20px;
          font-size: 1em;
        }
        
        .history-grid { 
          display: grid; 
          gap: 12px; 
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
        }
        
        .hist-card { 
          position: relative;
          background: var(--input-bg);
          border-radius: 12px; 
          border: 2px solid var(--border-color);
          transition: all 0.25s ease;
          overflow: hidden;
        }
        
        .hist-card-content {
          padding: 18px;
          text-align: center;
          cursor: pointer;
        }
        
        .hist-name {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
          font-size: 0.95em;
          transition: color 0.25s ease;
        }
        
        .hist-price {
          font-weight: 700;
          color: #B05857;
          font-size: 1.1em;
          transition: color 0.25s ease;
        }
        
        .hist-delete {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .hist-delete svg {
          stroke: #B05857;
          transition: stroke 0.25s ease;
        }
        
        .hist-card:hover {
          border-color: #2A5F8D;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(42, 95, 141, 0.25);
        }
        
        .hist-card:hover .hist-delete {
          opacity: 1;
        }
        
        .hist-delete:hover {
          background: #B05857;
          transform: scale(1.1);
        }
        
        .hist-delete:hover svg {
          stroke: white;
        }
        
        .hist-card:hover .hist-card-content {
          background: linear-gradient(135deg, #2A5F8D 0%, #A880A0 100%);
          border-radius: 12px;
        }
        
        .hist-card:hover .hist-name,
        .hist-card:hover .hist-price {
          color: white;
        }
        
        .confirm-modal {
          max-width: 400px;
        }
        
        .confirm-content {
          padding: 24px;
        }
        
        .confirm-text {
          color: var(--text-secondary);
          font-size: 1em;
          line-height: 1.6;
          margin: 0 0 24px;
          text-align: center;
        }
        
        .confirm-text strong {
          color: var(--text-primary);
          font-weight: 700;
        }
        
        .confirm-buttons {
          display: flex;
          gap: 12px;
        }
        
        .confirm-btn {
          flex: 1;
          padding: 14px 20px;
          font-size: 1em;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        
        .confirm-btn.cancel {
          background: var(--input-bg);
          color: var(--text-primary);
          border: 2px solid var(--border-color);
        }
        
        .confirm-btn.cancel:hover {
          background: var(--card-bg);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--shadow);
        }
        
        .confirm-btn.delete {
          background: linear-gradient(135deg, #B05857 0%, #C1726F 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(176, 88, 87, 0.3);
        }
        
        .confirm-btn.delete:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(176, 88, 87, 0.5);
        }
        
        .confirm-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}
