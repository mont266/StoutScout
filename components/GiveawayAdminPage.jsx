import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import AlertModal from './AlertModal.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';

const GiveawayAdminPage = ({ onClose, userProfile }) => {
    const [giveaways, setGiveaways] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPrizeDesc, setNewPrizeDesc] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [criteriaType, setCriteriaType] = useState('check_in_or_rating');
    const [numPeriods, setNumPeriods] = useState(1);

    const [viewGiveaway, setViewGiveaway] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [winnerModalOpen, setWinnerModalOpen] = useState(false);
    const [winnerModalStep, setWinnerModalStep] = useState(1);
    const [selectedPeriodForDraw, setSelectedPeriodForDraw] = useState(null);
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [selectedWinner, setSelectedWinner] = useState(null);

    const [prizeName, setPrizeName] = useState('');
    const [prizeCode, setPrizeCode] = useState('');
    const [prizeInstructions, setPrizeInstructions] = useState('');

    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', theme: 'info' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', theme: 'red', onConfirm: null });

    const showAlert = (title, message, theme = 'info') => {
        setAlertModal({ isOpen: true, title, message, theme });
    };

    useEffect(() => {
        fetchGiveaways();
    }, []);

    const fetchGiveaways = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('giveaways').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setGiveaways(data || []);
        } catch (err) {
            console.error("Error fetching giveaways", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGiveaway = async () => {
        if (!newTitle || !startDate || !endDate) return showAlert("Error", "Fill in required fields", "error");
        try {
            // Calculate period length
            const start = new Date(startDate);
            const end = new Date(endDate);
            const totalMs = end.getTime() - start.getTime();
            const msPerPeriod = totalMs / numPeriods;

            const { data: gData, error: gError } = await supabase.from('giveaways').insert({
                title: newTitle,
                description: newPrizeDesc ? `${newDesc}|||PRIZE|||${newPrizeDesc}` : newDesc,
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                criteria_type: criteriaType,
                is_active: true
            }).select().single();

            if (gError) throw gError;

            // Generate periods
            let pData = [];
            for (let i = 0; i < numPeriods; i++) {
                const pStart = new Date(start.getTime() + (msPerPeriod * i));
                const pEnd = new Date(start.getTime() + (msPerPeriod * (i + 1)) - 1000); // subtract 1s so they don't overlap
                pData.push({
                    giveaway_id: gData.id,
                    period_name: numPeriods > 1 ? `Week ${i + 1}` : 'Main Draw',
                    start_date: pStart.toISOString(),
                    end_date: pEnd.toISOString()
                });
            }

            const { error: pError } = await supabase.from('giveaway_periods').insert(pData);
            if (pError) throw pError;

            setIsCreating(false);
            setNewTitle('');
            setNewDesc('');
            setNewPrizeDesc('');
            setStartDate('');
            setEndDate('');
            setNumPeriods(1);
            fetchGiveaways();
        } catch (err) {
            console.error("Error creating giveaway:", err);
            showAlert("Error", "Error: " + err.message, "error");
        }
    };

    const handleViewGiveaway = async (giveaway) => {
        setViewGiveaway(giveaway);
        try {
            const { data, error } = await supabase
                .from('giveaway_periods')
                .select('*, giveaway_prizes(*)')
                .eq('giveaway_id', giveaway.id)
                .order('start_date', { ascending: true });
            if (error) throw error;
            setPeriods(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDrawWinnerClick = async (period) => {
        setSelectedPeriodForDraw(period);
        setWinnerModalStep(1);
        setWinnerModalOpen(true);
        // Find eligible
        try {
            const { data, error } = await supabase.from('giveaway_entries').select('user_id, profiles(username)').eq('period_id', period.id);
            if (error) throw error;
            setEligibleUsers(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const pickWinner = async () => {
        if (eligibleUsers.length === 0) return showAlert("Error", "No eligible users", "error");
        
        const idx = Math.floor(Math.random() * eligibleUsers.length);
        const winner = eligibleUsers[idx];
        setSelectedWinner(winner);
        
        setPrizeName('');
        setPrizeCode('');
        setPrizeInstructions('');
        
        setWinnerModalStep(2);
    };

    const confirmAwardWinner = async () => {
        if (!prizeName || !prizeCode) return showAlert("Error", "Prize name and code are required", "error");

        try {
            const { error } = await supabase.from('giveaway_prizes').insert({
                period_id: selectedPeriodForDraw.id,
                prize_name: prizeName,
                prize_code: prizeCode,
                how_to_redeem: prizeInstructions,
                winner_id: selectedWinner.user_id,
                status: 'won'
            });
            if (error) throw error;
            
            showAlert("Success", `Winner picked: ${selectedWinner.profiles?.username} - Prize awarded!`, "success");
            setWinnerModalOpen(false);
            handleViewGiveaway(viewGiveaway);
        } catch (err) {
            console.error(err);
            showAlert("Error", "Error awarding prize", "error");
        }
    };

    const handleDeleteGiveaway = async (giveawayId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Giveaway',
            message: 'Are you sure you want to delete this giveaway? All associated periods, entries, and prizes will be permanently deleted.',
            theme: 'red',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const { error } = await supabase.from('giveaways').delete().eq('id', giveawayId);
                    if (error) throw error;
                    
                    showAlert("Success", "Giveaway and all associated data deleted successfully.", "success");
                    setViewGiveaway(null);
                    fetchGiveaways();
                } catch (err) {
                    console.error("Error deleting giveaway:", err);
                    showAlert("Error", "Error deleting giveaway: " + err.message, "error");
                }
            }
        });
    };

    if (viewGiveaway) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 animate-fade-in-up m-4 relative">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setViewGiveaway(null)} className="text-amber-600 dark:text-amber-400 font-semibold"><i className="fas fa-arrow-left mr-2"></i>Back</button>
                    <button onClick={() => handleDeleteGiveaway(viewGiveaway.id)} className="text-red-500 hover:text-red-700 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded text-sm font-semibold"><i className="fas fa-trash-alt mr-2"></i>Delete</button>
                </div>
                <h2 className="text-2xl font-bold dark:text-white mb-2">{viewGiveaway.title}</h2>
                <div className="space-y-4">
                    {periods.map(p => (
                        <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h3 className="font-bold dark:text-white">{p.period_name}</h3>
                            <p className="text-sm text-gray-500">{new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}</p>
                            
                            <div className="mt-2">
                                {p.giveaway_prizes && p.giveaway_prizes.length > 0 ? (
                                    <div className="text-sm text-green-600 font-semibold">Prize Awarded!</div>
                                ) : (
                                    <button onClick={() => handleDrawWinnerClick(p)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-sm mt-2">Draw Winner</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {winnerModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[99998] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
                            {winnerModalStep === 1 ? (
                                <>
                                    <h3 className="font-bold text-xl dark:text-white mb-2">Draw Winner</h3>
                                    <p className="dark:text-gray-300 mb-6 text-sm text-gray-600">Drawing winner for: <strong>{selectedPeriodForDraw?.period_name}</strong>. Mmmm... the anticipation.</p>
                                    
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center mb-6 border border-gray-200 dark:border-gray-600">
                                        <i className="fas fa-users text-3xl text-amber-500 mb-2"></i>
                                        <div className="text-2xl font-black dark:text-white">{eligibleUsers.length}</div>
                                        <div className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400">Eligible Users</div>
                                    </div>
                                    
                                    <div className="flex space-x-3">
                                        <button onClick={() => setWinnerModalOpen(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 dark:bg-gray-700 text-gray-800 dark:text-white py-2 rounded-lg font-semibold transition-colors">Cancel</button>
                                        <button onClick={pickWinner} className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center"><i className="fas fa-random mr-2"></i>Pick Winner</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-center mb-6">
                                        <div className="h-16 w-16 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
                                            <i className="fas fa-trophy"></i>
                                        </div>
                                        <h3 className="font-bold text-xl dark:text-white">Winner Selected!</h3>
                                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-2">{selectedWinner?.profiles?.username}</p>
                                    </div>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Prize Name</label>
                                            <input type="text" placeholder="e.g. £15 Amazon Voucher" value={prizeName} onChange={e => setPrizeName(e.target.value)} className="w-full p-2.5 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Voucher Code / Link</label>
                                            <input type="text" placeholder="Enter code" value={prizeCode} onChange={e => setPrizeCode(e.target.value)} className="w-full p-2.5 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Redemption Instructions (Optional)</label>
                                            <textarea placeholder="e.g. Go to amazon.co.uk to redeem" value={prizeInstructions} onChange={e => setPrizeInstructions(e.target.value)} className="w-full p-2.5 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" rows="2"></textarea>
                                        </div>
                                    </div>

                                    <div className="flex space-x-3">
                                        <button onClick={() => setWinnerModalOpen(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 dark:bg-gray-700 text-gray-800 dark:text-white py-2 rounded-lg font-semibold transition-colors">Cancel</button>
                                        <button onClick={confirmAwardWinner} className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg transition-colors">Award Prize</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
                
                {alertModal.isOpen && (
                    <AlertModal
                        title={alertModal.title}
                        message={alertModal.message}
                        theme={alertModal.theme}
                        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                    />
                )}
                
                {confirmModal.isOpen && (
                    <ConfirmationModal
                        title={confirmModal.title}
                        message={confirmModal.message}
                        theme={confirmModal.theme}
                        onConfirm={confirmModal.onConfirm}
                        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 animate-fade-in-up m-4 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
            <h1 className="text-2xl font-bold dark:text-white mb-6"><i className="fas fa-gift text-amber-500 mr-2"></i>Giveaways Admin</h1>

            {isCreating ? (
                <div className="space-y-4 mb-8 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <input type="text" placeholder="Title (e.g. 1st Anniversary Giveaway)" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white" />
                    <textarea placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white" />
                    <input type="text" placeholder="Prize description (e.g. £15 Amazon Voucher)" value={newPrizeDesc} onChange={e => setNewPrizeDesc(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white" />
                    <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">End Date</label>
                            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white" />
                        </div>
                    </div>
                    <select value={criteriaType} onChange={e => setCriteriaType(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white">
                        <option value="check_in_or_rating">Check in OR Rating</option>
                        <option value="rating_only">Rating Only</option>
                        <option value="check_in_only">Check-in Only</option>
                    </select>
                    <select value={numPeriods} onChange={e => setNumPeriods(Number(e.target.value))} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white">
                        <option value={1}>Single Draw (1 period)</option>
                        <option value={2}>2 Weeks (2 periods)</option>
                        <option value={4}>4 Weeks (4 periods)</option>
                    </select>
                    <div className="flex space-x-2">
                        <button onClick={handleCreateGiveaway} className="bg-amber-500 text-white font-bold py-2 px-4 rounded hover:bg-amber-600 transition-colors">Create</button>
                        <button onClick={() => setIsCreating(false)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setIsCreating(true)} className="bg-amber-500 text-white font-bold py-2 px-4 rounded hover:bg-amber-600 mb-6 flex items-center transition-colors"><i className="fas fa-plus mr-2"></i>New Giveaway</button>
            )}

            <div className="space-y-4">
                <h3 className="font-bold dark:text-white mb-2">Existing Giveaways</h3>
                {loading ? <p className="dark:text-gray-400">Loading...</p> : giveaways.map(g => (
                    <div key={g.id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex justify-between items-center bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => handleViewGiveaway(g)}>
                        <div>
                            <h4 className="font-bold dark:text-white">{g.title}</h4>
                            <p className="text-sm text-gray-500">{new Date(g.start_date).toLocaleDateString()} - {new Date(g.end_date).toLocaleDateString()}</p>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                    </div>
                ))}
            </div>
            
            {alertModal.isOpen && (
                <AlertModal
                    title={alertModal.title}
                    message={alertModal.message}
                    theme={alertModal.theme}
                    onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                />
            )}
            
            {confirmModal.isOpen && (
                <ConfirmationModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    theme={confirmModal.theme}
                    onConfirm={confirmModal.onConfirm}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                />
            )}
        </div>
    );
};

export default GiveawayAdminPage;
