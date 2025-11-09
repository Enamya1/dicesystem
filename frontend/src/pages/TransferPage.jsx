import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CreditCard, Calendar, Repeat, FileUp, Save } from 'lucide-react';
import { searchUsers, sendTransfer } from '../services/apiClient';

const TransferPage = ({ contacts = [], accountInfo, onTransferComplete }) => {
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [currencyFrom, setCurrencyFrom] = useState('USD');
  const [currencyTo, setCurrencyTo] = useState('USD');
  const [speed, setSpeed] = useState('standard');
  const [sourceAccount, setSourceAccount] = useState(null);
  const [schedule, setSchedule] = useState('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [purpose, setPurpose] = useState('personal');
  const [attachmentName, setAttachmentName] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [completedRecipient, setCompletedRecipient] = useState(null);
  const [completedAmount, setCompletedAmount] = useState(0);
  const [transferRef, setTransferRef] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingRecipients, setSearchingRecipients] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [sendingTransfer, setSendingTransfer] = useState(false);

  const fx = {
    USD: { USD: 1, EUR: 0.92, GBP: 0.79 },
    EUR: { USD: 1.09, EUR: 1, GBP: 0.86 },
    GBP: { USD: 1.27, EUR: 1.16, GBP: 1 },
  };
  const baseFeePct = 0.015; // 1.5%
  const speedFeePct = { economy: 0, standard: 0.005, instant: 0.01 };
  const minFee = 1;

  useEffect(() => {
    if (!Array.isArray(contacts) || !contacts.length) return;
    setRecipients((prev) => {
      const existingIds = new Set(prev.map((r) => r.userId));
      const mapped = contacts
        .filter((c) => c.contact_id && !existingIds.has(c.contact_id))
        .map((c) => ({
          id: `contact-${c.id}`,
          userId: c.contact_id,
          name: c.alias || c.username,
          account: c.username,
        }));
      if (!mapped.length) {
        return prev;
      }
      return [...prev, ...mapped];
    });
  }, [contacts]);

  const recipient = useMemo(
    () => recipients.find((r) => String(r.userId) === String(recipientId)) || null,
    [recipientId, recipients]
  );
  const rate = fx[currencyFrom][currencyTo];
  const sendAmount = Number(amount || 0);
  const fee = Math.max(minFee, sendAmount * baseFeePct) + sendAmount * speedFeePct[speed];
  const totalDebit = sendAmount + fee;
  const receiveAmount = sendAmount * rate;
  const arrivalEta = { economy: '2-3 business days', standard: 'Next business day', instant: 'Within minutes' }[speed];
  const dailyLimit = 5000;
  const overLimit = totalDebit > dailyLimit && currencyFrom === 'USD';
  const sourceAccountLabel = sourceAccount?.label ?? 'Primary account';

  const handleRecipientSearch = async () => {
    if (!recipientSearch.trim()) return;
    setSearchingRecipients(true);
    setTransferError('');
    try {
      const results = await searchUsers(recipientSearch.trim());
      setSearchResults(results);
    } catch (error) {
      setTransferError(error?.message || 'Unable to search users');
      setSearchResults([]);
    } finally {
      setSearchingRecipients(false);
    }
  };

  const addRecipientFromResult = (user) => {
    if (!user?.id) return;
    setRecipients((prev) => {
      if (prev.some((r) => r.userId === user.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `user-${user.id}`,
          userId: user.id,
          name: user.full_name || user.username,
          account: user.username,
        },
      ];
    });
    setRecipientId(String(user.id));
    setSearchResults([]);
    setRecipientSearch('');
  };

  useEffect(() => {
    if (accountInfo) {
      setSourceAccount({
        id: accountInfo.user_id,
        label: accountInfo.card_number ? `Card ${accountInfo.card_number}` : 'Primary account',
        balance: Number(accountInfo.balance ?? 0),
        raw: accountInfo,
      });
    } else {
      setSourceAccount(null);
    }
  }, [accountInfo]);

  const executeTransfer = async () => {
    if (!sourceAccount) {
      setTransferError('No funding account available.');
      return;
    }
    if (!recipientId) {
      setTransferError('Select a recipient');
      return;
    }
    if (!sendAmount || sendAmount <= 0) {
      setTransferError('Enter a valid amount');
      return;
    }
    if (!otpCode || otpCode.length < 4) {
      setTransferError('Enter the OTP code');
      return;
    }
    setSendingTransfer(true);
    setTransferError('');
    const amountNumeric = sendAmount;
    try {
      const response = await sendTransfer({
        receiver_id: Number(recipientId),
        amount: amountNumeric,
        description: note || undefined,
      });
      const reference = response?.reference || `DB-${Date.now().toString().slice(-6)}`;
      if (saveAsTemplate && templateName.trim()) {
        const id = `t${Date.now()}`;
        setTemplates((prev) => [
          ...prev,
          { id, name: templateName.trim(), recipientId, amount: amountNumeric, currencyFrom, currencyTo, speed, purpose, note },
        ]);
      }
      setTransferRef(reference);
      setCompletedRecipient(recipient);
      setCompletedAmount(amountNumeric);
      setShowConfirm(false);
      setShowReceipt(true);
      setOtpCode('');
      setTemplateName('');
      setSaveAsTemplate(false);
      setRecipientId('');
      setAmount('');
      setNote('');
      setAttachmentName('');
      if (typeof onTransferComplete === 'function') {
        try {
          await onTransferComplete();
        } catch (err) {
          console.error('Failed to refresh data after transfer', err);
        }
      }
    } catch (error) {
      setTransferError(error?.message || 'Transfer failed');
    } finally {
      setSendingTransfer(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!recipientId) nextErrors.recipientId = 'Select a recipient';
    if (!amount || Number(amount) <= 0) nextErrors.amount = 'Enter a valid amount';
    if (schedule === 'later' && !scheduleDate) nextErrors.scheduleDate = 'Pick a date';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setShowConfirm(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Money</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-8" onSubmit={onSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    className={`w-full px-5 py-4 border rounded-2xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm ${errors.recipientId ? 'border-red-400' : 'border-gray-200'}`}
                    disabled={!recipients.length}
                  >
                    <option value="">Select recipient</option>
                    {recipients.map((r) => (
                      <option key={r.id} value={r.userId}>
                        {r.name} ({r.account})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleRecipientSearch}
                    className="px-5 py-4 rounded-2xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold shadow-sm disabled:opacity-50"
                    disabled={searchingRecipients || !recipientSearch.trim()}
                  >
                    {searchingRecipients ? 'Searching...' : 'Search'}
                  </button>
                </div>
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search by username or name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchResults.length > 0 && (
                  <div className="border border-indigo-100 rounded-xl divide-y divide-indigo-50">
                    {searchResults.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => addRecipientFromResult(user)}
                        className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-indigo-50"
                      >
                        <span className="text-left">
                          <span className="font-semibold text-gray-900">{user.full_name}</span>
                          <span className="block text-xs text-gray-500">{user.username}</span>
                        </span>
                        <ArrowRight size={16} className="text-indigo-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.recipientId && <p className="text-xs text-red-600 mt-2">{errors.recipientId}</p>}
            </div>

            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apply Template</label>
                <div className="flex gap-3">
                  <select className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" onChange={(e)=>{
                    const t = templates.find(x=>x.id===e.target.value);
                    if (!t) return;
                    setRecipientId(t.recipientId);
                    setAmount(String(t.amount));
                    setCurrencyFrom(t.currencyFrom);
                    setCurrencyTo(t.currencyTo);
                    setSpeed(t.speed);
                    setPurpose(t.purpose);
                    setNote(t.note||'');
                  }} defaultValue="">
                    <option value="">Select a template</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button type="button" className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={()=>setTemplates([])}>Clear</button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Account</label>
              {sourceAccount ? (
                <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Primary Account</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${sourceAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {sourceAccount.label}
                    {accountInfo?.card_active === false ? ' (card inactive)' : ''}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500">
                  No account information available. Please ensure your profile has an active account.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-5 py-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-2xl md:text-3xl font-semibold tracking-tight ${errors.amount ? 'border-red-400' : 'border-gray-200'}`}
                />
                <select value={currencyFrom} onChange={(e) => setCurrencyFrom(e.target.value)} className="px-4 py-4 border border-gray-200 rounded-2xl text-lg font-medium w-28">
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                </select>
                <div className="px-3 py-3 text-xl text-gray-600">-</div>
                <select value={currencyTo} onChange={(e) => setCurrencyTo(e.target.value)} className="px-4 py-4 border border-gray-200 rounded-2xl text-lg font-medium w-28">
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                </select>
              </div>
              {errors.amount && <p className="text-xs text-red-600 mt-2">{errors.amount}</p>}
              <p className="text-xs text-gray-500 mt-2">Rate: 1 {currencyFrom} = {rate.toFixed(2)} {currencyTo}</p>
              {overLimit && (
                <p className="text-xs text-amber-600 mt-2">Warning: This exceeds the daily limit of {currencyFrom} {dailyLimit.toFixed(2)}. You may be asked to verify.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Speed</label>
              <div className="grid grid-cols-3 gap-3">
                <button type="button" onClick={() => setSpeed('economy')} className={`px-4 py-3 rounded-xl border text-sm ${speed==='economy' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'border-gray-200 hover:bg-gray-50'}`}>Economy</button>
                <button type="button" onClick={() => setSpeed('standard')} className={`px-4 py-3 rounded-xl border text-sm ${speed==='standard' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'border-gray-200 hover:bg-gray-50'}`}>Standard</button>
                <button type="button" onClick={() => setSpeed('instant')} className={`px-4 py-3 rounded-xl border text-sm ${speed==='instant' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'border-gray-200 hover:bg-gray-50'}`}>Instant</button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Estimated arrival: {arrivalEta}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="radio" name="sched" checked={schedule==='now'} onChange={() => setSchedule('now')} /> Now
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="radio" name="sched" checked={schedule==='later'} onChange={() => setSchedule('later')} /> Later
                </label>
                {schedule==='later' && (
                  <input type="date" value={scheduleDate} onChange={(e)=>setScheduleDate(e.target.value)} className={`px-3 py-2 border rounded-xl ${errors.scheduleDate ? 'border-red-400' : 'border-gray-200'}`} />
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={recurring} onChange={(e)=>setRecurring(e.target.checked)} /> Recurring
                </label>
                {recurring && (
                  <select value={frequency} onChange={(e)=>setFrequency(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
              <select value={purpose} onChange={(e)=>setPurpose(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3">
                <option value="personal">Personal</option>
                <option value="family">Family Support</option>
                <option value="rent">Rent</option>
                <option value="invoice">Invoice Payment</option>
                <option value="gift">Gift</option>
                <option value="other">Other</option>
              </select>
              <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
              <textarea
                rows="3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              ></textarea>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (optional)</label>
                <div className="flex items-center gap-3">
                  <input type="file" onChange={(e)=>setAttachmentName(e.target.files?.[0]?.name||'')} className="text-sm" />
                  {attachmentName && <span className="text-xs text-gray-600">{attachmentName}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={saveAsTemplate} onChange={(e)=>setSaveAsTemplate(e.target.checked)} /> Save as template
              </label>
              {saveAsTemplate && (
                <input type="text" value={templateName} onChange={(e)=>setTemplateName(e.target.value)} placeholder="Template name" className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              )}
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3.5 rounded-2xl text-base font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-xl hover:shadow-2xl ring-1 ring-indigo-400/30">Review Transfer</button>
          </div>

          <div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Recipient</span><span className="font-medium text-gray-900">{recipient ? `${recipient.name}` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">From</span><span className="font-medium text-gray-900">{sourceAccountLabel}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Send</span><span className="font-medium text-gray-900">{currencyFrom} {sendAmount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Rate</span><span className="font-medium text-gray-900">1 {currencyFrom} = {rate.toFixed(2)} {currencyTo}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Fees</span><span className="font-medium text-gray-900">{currencyFrom} {fee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Total debit</span><span className="font-bold text-gray-900">{currencyFrom} {totalDebit.toFixed(2)}</span></div>
                <div className="border-t pt-3 flex justify-between"><span className="text-gray-600">Recipient gets</span><span className="font-bold text-indigo-700">{currencyTo} {receiveAmount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Speed</span><span className="font-medium text-gray-900 capitalize">{speed}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Schedule</span><span className="font-medium text-gray-900">{schedule==='now' ? 'Now' : scheduleDate || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Purpose</span><span className="font-medium text-gray-900 capitalize">{purpose}</span></div>
                {recurring && <div className="flex justify-between"><span className="text-gray-600">Recurring</span><span className="font-medium text-gray-900">{frequency}</span></div>}
              </div>
            </div>
          </div>
        </form>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowConfirm(false); setTransferError(''); }} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Confirm Transfer</h3>
            <p className="text-sm text-gray-500 mb-4">Review the details below before sending</p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-600">To</span><span className="font-medium text-gray-900">{recipient?.name} - {recipient?.account}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">From</span><span className="font-medium text-gray-900">{sourceAccountLabel}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Send</span><span className="font-medium text-gray-900">{currencyFrom} {sendAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Fees</span><span className="font-medium text-gray-900">{currencyFrom} {fee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total debit</span><span className="font-bold text-gray-900">{currencyFrom} {totalDebit.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Recipient gets</span><span className="font-bold text-indigo-700">{currencyTo} {receiveAmount.toFixed(2)}</span></div>
              {note && <div className="flex justify-between"><span className="text-gray-600">Note</span><span className="font-medium text-gray-900">{note}</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">Purpose</span><span className="font-medium text-gray-900 capitalize">{purpose}</span></div>
              {attachmentName && <div className="flex justify-between"><span className="text-gray-600">Attachment</span><span className="font-medium text-gray-900 truncate max-w-[60%]" title={attachmentName}>{attachmentName}</span></div>}
            </div>
            {saveAsTemplate && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Save as template</label>
                <input value={templateName} onChange={(e)=>setTemplateName(e.target.value)} placeholder="Template name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                <input value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} placeholder="6-digit code" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                {overLimit && <p className="text-xs text-amber-600 mt-1">Extra verification required due to limit.</p>}
              </div>
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setShowConfirm(false); setTransferError(''); }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  type="button"
                  onClick={executeTransfer}
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  disabled={sendingTransfer}
                >
                  {sendingTransfer ? 'Sending...' : 'Verify & Send'}
                </button>
              </div>
              {transferError ? <p className="text-sm text-red-600">{transferError}</p> : null}
            </div>
          </div>
        </div>
      )}

      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReceipt(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Transfer Successful</h3>
            <p className="text-sm text-gray-500 mb-4">Your transfer has been sent.</p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-600">Reference</span><span className="font-mono font-medium text-gray-900">{transferRef}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Amount</span><span className="font-medium text-gray-900">{currencyFrom} {Number(completedAmount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Recipient</span><span className="font-medium text-gray-900">{completedRecipient?.name || '-'}</span></div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => { navigator.clipboard?.writeText(transferRef); }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Copy Ref</button>
              <button type="button" onClick={() => setShowReceipt(false)} className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferPage;
