import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase.js';
import ConfirmationModal from './ConfirmationModal.jsx';
import { createPortal } from 'react-dom';

const ChangeItemEditor = ({ item, index, onUpdate, onRemove, onMove }) => {
    return (
        <div className="flex items-start space-x-2 p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md">
            <div className="flex flex-col items-center space-y-1 pt-1">
                <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="disabled:opacity-20"><i className="fas fa-chevron-up"></i></button>
                <button type="button" onClick={() => onMove(index, 1)} className="disabled:opacity-20"><i className="fas fa-chevron-down"></i></button>
            </div>
            <div className="flex-grow space-y-2">
                <select value={item.type} onChange={(e) => onUpdate(index, { ...item, type: e.target.value })} className="w-full text-sm px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                    <option value="new">New Feature</option>
                    <option value="improvement">Improvement</option>
                    <option value="fix">Bug Fix</option>
                </select>
                <textarea
                    value={item.description}
                    onChange={(e) => onUpdate(index, { ...item, description: e.target.value })}
                    placeholder="Describe the change..."
                    rows="2"
                    className="w-full text-sm px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                    required
                />
            </div>
            <button type="button" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700 pt-1"><i className="fas fa-trash-alt"></i></button>
        </div>
    );
};

const ChangelogForm = ({ item: initialItem, onSave, onCancel, isSaving }) => {
    const [item, setItem] = useState(initialItem || { version: '', title: '', release_date: new Date().toISOString().split('T')[0], changes: [{ type: 'new', description: '' }], is_published: false });

    const handleFieldChange = (field, value) => setItem(prev => ({ ...prev, [field]: value }));

    const handleChangesUpdate = (index, updatedChange) => {
        const newChanges = [...item.changes];
        newChanges[index] = updatedChange;
        setItem(prev => ({ ...prev, changes: newChanges }));
    };

    const handleAddChange = () => {
        setItem(prev => ({ ...prev, changes: [...prev.changes, { type: 'new', description: '' }] }));
    };

    const handleRemoveChange = (index) => {
        setItem(prev => ({ ...prev, changes: prev.changes.filter((_, i) => i !== index) }));
    };
    
    const handleMoveChange = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= item.changes.length) return;
        const newChanges = [...item.changes];
        [newChanges[index], newChanges[newIndex]] = [newChanges[newIndex], newChanges[index]]; // Swap
        setItem(prev => ({ ...prev, changes: newChanges }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(item);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <h2 className="text-xl font-bold">{initialItem?.id ? 'Edit Entry' : 'Add New Entry'}</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Version</label>
                    <input type="text" value={item.version} onChange={(e) => handleFieldChange('version', e.target.value)} placeholder="e.g., V1.34" className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                </div>
                <div>
                    <label className="block text-sm font-medium">Release Date</label>
                    <input type="date" value={item.release_date} onChange={(e) => handleFieldChange('release_date', e.target.value)} className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium">Title</label>
                <input type="text" value={item.title} onChange={(e) => handleFieldChange('title', e.target.value)} placeholder="e.g., The Pub Crawl Update!" className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Changes</label>
                <div className="space-y-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md">
                    {item.changes.map((change, index) => (
                        <ChangeItemEditor key={index} item={change} index={index} onUpdate={handleChangesUpdate} onRemove={handleRemoveChange} onMove={handleMoveChange} />
                    ))}
                    <button type="button" onClick={handleAddChange} className="w-full text-sm py-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">Add Change</button>
                </div>
            </div>
             <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-gray-700 dark:text-gray-300">Published</span>
                <div className="relative">
                    <input type="checkbox" className="sr-only peer" checked={item.is_published} onChange={(e) => handleFieldChange('is_published', e.target.checked)} />
                    <div className="block w-14 h-8 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
                </div>
            </label>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 disabled:bg-amber-300 flex items-center">{isSaving && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>}Save</button>
            </div>
        </form>
    );
};

const ChangelogManager = ({ onClose }) => {
    const [view, setView] = useState('list');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentItem, setCurrentItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from('changelog_items')
                .select('*')
                .order('release_date', { ascending: false });

            if (dbError) throw dbError;
            setItems(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (itemData) => {
        setIsSaving(true);
        const { error: saveError } = await supabase.from('changelog_items').upsert(itemData);
        if (saveError) {
            setError(saveError.message);
        } else {
            setView('list');
            setCurrentItem(null);
            fetchData();
        }
        setIsSaving(false);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const { error: deleteError } = await supabase.from('changelog_items').delete().eq('id', itemToDelete.id);
        if (deleteError) {
            setError(deleteError.message);
        } else {
            fetchData();
        }
        setItemToDelete(null);
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1300] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="changelog-manager-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {itemToDelete && (
                    <ConfirmationModal
                        isOpen={!!itemToDelete}
                        onClose={() => setItemToDelete(null)}
                        onConfirm={confirmDelete}
                        title="Delete Changelog Entry?"
                        message={`Are you sure you want to delete version ${itemToDelete.version}? This cannot be undone.`}
                        theme="red"
                    />
                )}
                
                {view === 'list' ? (
                    <>
                        <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h1 id="changelog-manager-title" className="text-xl font-bold text-gray-900 dark:text-white">Manage Changelog</h1>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setCurrentItem(null); setView('form'); }} className="bg-amber-500 text-black font-bold py-2 px-4 rounded-lg text-sm hover:bg-amber-400">Add New</button>
                                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full" aria-label="Close">
                                    <i className="fas fa-times fa-lg"></i>
                                </button>
                            </div>
                        </header>
                        <main className="flex-grow overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
                            {loading && <div className="text-center">Loading...</div>}
                            {error && <div className="text-center text-red-500">{error}</div>}
                            <ul className="space-y-3">
                                {items.map(item => (
                                    <li key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{item.version} <span className="font-normal text-gray-500 dark:text-gray-400">- {item.title}</span></p>
                                            <p className="text-xs">{new Date(item.release_date).toLocaleDateString()}</p>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.is_published ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                {item.is_published ? 'Published' : 'Draft'}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => { setCurrentItem(item); setView('form'); }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><i className="fas fa-pencil-alt"></i></button>
                                            <button onClick={() => setItemToDelete(item)} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><i className="fas fa-trash-alt"></i></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </main>
                    </>
                ) : (
                    <main className="flex-grow overflow-y-auto">
                        <ChangelogForm item={currentItem} onSave={handleSave} onCancel={() => setView('list')} isSaving={isSaving} />
                    </main>
                )}
            </div>
        </div>
    );
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default ChangelogManager;