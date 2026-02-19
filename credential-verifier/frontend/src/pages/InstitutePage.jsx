import React, { useState } from 'react';
import { useWalletContext } from '../context/WalletContext';
import { issueCredential, transferToStudent, revokeCredential } from '../lib/contract';
import { getExplorerUrl, APP_ID } from '../lib/algorand';
import CertificateQR from '../components/CertificateQR';
import toast from 'react-hot-toast';

const TABS = ['Issue Credential', 'Transfer to Student', 'Revoke Credential'];

export default function InstitutePage() {
    const [activeTab, setActiveTab] = useState(0);
    const { isConnected, activeAccount, signer, connect, isConnecting } = useWalletContext();

    return (
        <div className="fade-in">
            <div className="section-header">
                <h2>Educational Institute Portal</h2>
                <p>Manage academic credentials on the Algorand blockchain. All actions require admin wallet.</p>
                {APP_ID === 0 && (
                    <div className="result-box error" style={{ marginTop: 16 }}>
                        <h4>⚠️ App ID not configured</h4>
                        <code>Copy .env.example → .env and set VITE_APP_ID to your deployed contract ID.</code>
                    </div>
                )}
            </div>

            {!isConnected && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    marginBottom: 24,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span>🔐</span>
                        <p style={{ color: 'var(--accent-purple)', fontWeight: 500, margin: 0 }}>
                            Connect your Pera Wallet to access admin functions.
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={connect}
                        disabled={isConnecting}
                        id="btn-institute-connect-wallet"
                    >
                        {isConnecting ? <><span className="spinner" /> Connecting&hellip;</> : '🔗 Connect Pera Wallet'}
                    </button>
                </div>
            )}

            <div className="tabs">
                {TABS.map((tab, idx) => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === idx ? 'active' : ''}`}
                        onClick={() => setActiveTab(idx)}
                        id={`tab-${tab.toLowerCase().replace(/ /g, '-')}`}
                    >
                        {['🎫', '📤', '🚫'][idx]} {tab}
                    </button>
                ))}
            </div>

            {activeTab === 0 && <IssueForm isConnected={isConnected} sender={activeAccount} signer={signer} connect={connect} isConnecting={isConnecting} />}
            {activeTab === 1 && <TransferForm isConnected={isConnected} sender={activeAccount} signer={signer} connect={connect} isConnecting={isConnecting} />}
            {activeTab === 2 && <RevokeForm isConnected={isConnected} sender={activeAccount} signer={signer} connect={connect} isConnecting={isConnecting} />}
        </div>
    );
}

/* ─── Issue Credential Form ─── */
function IssueForm({ isConnected, sender, signer, connect, isConnecting }) {
    const [form, setForm] = useState({ studentAddress: '', assetName: '', unitName: '', ipfsUrl: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    function handleChange(e) {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!isConnected) {
            toast('Connecting wallet first…', { icon: '🔗' });
            const accs = await connect();
            if (!accs || accs.length === 0) return; // user cancelled
        }
        if (!form.studentAddress || !form.assetName || !form.unitName) {
            return toast.error('Please fill all required fields.');
        }
        setLoading(true);
        setResult(null);
        try {
            const { txId, assetId } = await issueCredential(sender, signer, form);
            setResult({ txId, assetId: assetId?.toString() });
            toast.success('Credential issued successfully!');
        } catch (error) {
            toast.error(error?.message || 'Transaction failed.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 8 }}>🎫 Issue Credential</h3>
            <p style={{ marginBottom: 24, fontSize: '0.9rem' }}>
                Mint a non-transferable NFT certificate (ASA) for a student. Returns the new Asset ID.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="issue-student-address">Student Algorand Address *</label>
                    <input
                        id="issue-student-address"
                        className="form-input"
                        name="studentAddress"
                        placeholder="ABCDEF1234…"
                        value={form.studentAddress}
                        onChange={handleChange}
                        disabled={loading}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="issue-asset-name">Credential Name *</label>
                    <input
                        id="issue-asset-name"
                        className="form-input"
                        name="assetName"
                        placeholder="Bachelor of Computer Science"
                        value={form.assetName}
                        onChange={handleChange}
                        disabled={loading}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="issue-unit-name">Unit Name *</label>
                    <input
                        id="issue-unit-name"
                        className="form-input"
                        name="unitName"
                        placeholder="BSCS"
                        maxLength={8}
                        value={form.unitName}
                        onChange={handleChange}
                        disabled={loading}
                    />
                    <span className="form-hint">Short identifier (max 8 chars)</span>
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="issue-ipfs-url">IPFS URL (Certificate PDF/Metadata)</label>
                    <input
                        id="issue-ipfs-url"
                        className="form-input"
                        name="ipfsUrl"
                        placeholder="ipfs://Qm…"
                        value={form.ipfsUrl}
                        onChange={handleChange}
                        disabled={loading}
                    />
                    <span className="form-hint">Link to off-chain certificate document</span>
                </div>
                <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loading || isConnecting}
                    id="btn-issue-credential"
                >
                    {isConnecting ? <><span className="spinner" /> Connecting&hellip;</>
                        : loading ? <><span className="spinner" /> Issuing&hellip;</>
                            : !isConnected ? '🔗 Connect Wallet & Issue'
                                : '🎫 Issue Credential'}
                </button>
            </form>

            {result && (
                <div style={{ marginTop: 24 }}>
                    <div className="result-box">
                        <h4>✅ Credential Issued!</h4>
                        <div className="info-grid" style={{ marginTop: 12 }}>
                            <div className="info-row">
                                <span className="info-label">Asset ID</span>
                                <span className="info-value">{result.assetId}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Transaction</span>
                                <a
                                    className="info-value"
                                    href={getExplorerUrl('tx', result.txId)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                                >
                                    {result.txId?.slice(0, 16)}&hellip; ↗
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* QR code so admin can instantly share verify link with student */}
                    <div style={{ marginTop: 20 }}>
                        <CertificateQR nftId={result.assetId} />
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Transfer Form ─── */
function TransferForm({ isConnected, sender, signer, connect, isConnecting }) {
    const [form, setForm] = useState({ assetId: '', studentAddress: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    function handleChange(e) {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!isConnected) {
            toast('Connecting wallet first…', { icon: '🔗' });
            const accs = await connect();
            if (!accs || accs.length === 0) return;
        }
        if (!form.assetId || !form.studentAddress) return toast.error('Please fill all fields.');
        setLoading(true);
        setResult(null);
        try {
            const { txId } = await transferToStudent(sender, signer, form);
            setResult({ txId });
            toast.success('Credential transferred to student!');
        } catch (error) {
            toast.error(error?.message || 'Transaction failed.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 8 }}>📤 Transfer Credential to Student</h3>
            <p style={{ marginBottom: 24, fontSize: '0.9rem' }}>
                Transfer a minted credential ASA from the contract to the student's wallet.
                The student must have already opted-in to the ASA.
            </p>

            <div className="result-box" style={{ marginBottom: 24, background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.25)' }}>
                <h4 style={{ color: 'var(--accent-purple)' }}>ℹ️ Student Opt-In Required</h4>
                <code>The student must opt-in to the ASA on the Student page before transfer.</code>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="transfer-asset-id">Asset ID *</label>
                    <input
                        id="transfer-asset-id"
                        className="form-input"
                        name="assetId"
                        type="number"
                        placeholder="1234567890"
                        value={form.assetId}
                        onChange={handleChange}
                        disabled={loading}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="transfer-student-address">Student Algorand Address *</label>
                    <input
                        id="transfer-student-address"
                        className="form-input"
                        name="studentAddress"
                        placeholder="ABCDEF1234…"
                        value={form.studentAddress}
                        onChange={handleChange}
                        disabled={loading}
                    />
                </div>
                <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loading || isConnecting}
                    id="btn-transfer-credential"
                >
                    {isConnecting ? <><span className="spinner" /> Connecting&hellip;</>
                        : loading ? <><span className="spinner" /> Transferring&hellip;</>
                            : !isConnected ? '🔗 Connect Wallet & Transfer'
                                : '📤 Transfer to Student'}
                </button>
            </form>

            {result && (
                <div className="result-box" style={{ marginTop: 24 }}>
                    <h4>✅ Transferred Successfully!</h4>
                    <div className="info-row" style={{ marginTop: 12 }}>
                        <span className="info-label">Transaction</span>
                        <a href={getExplorerUrl('tx', result.txId)} target="_blank" rel="noreferrer" className="info-value">
                            {result.txId?.slice(0, 16)}… ↗
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Revoke Form ─── */
function RevokeForm({ isConnected, sender, signer, connect, isConnecting }) {
    const [form, setForm] = useState({ assetId: '', studentAddress: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [confirmed, setConfirmed] = useState(false);

    function handleChange(e) {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!isConnected) {
            toast('Connecting wallet first…', { icon: '🔗' });
            const accs = await connect();
            if (!accs || accs.length === 0) return;
        }
        if (!confirmed) return toast.error('Please confirm revocation by checking the box.');
        if (!form.assetId || !form.studentAddress) return toast.error('Please fill all fields.');
        setLoading(true);
        setResult(null);
        try {
            const { txId } = await revokeCredential(sender, signer, form);
            setResult({ txId });
            toast.success('Credential revoked!');
        } catch (error) {
            toast.error(error?.message || 'Transaction failed.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 8 }}>🚫 Revoke Credential</h3>
            <p style={{ marginBottom: 24, fontSize: '0.9rem' }}>
                Permanently revoke a student's credential. This freezes the ASA, claws it back to
                the contract, and marks it as revoked on-chain. This action cannot be undone.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="revoke-asset-id">Asset ID *</label>
                    <input
                        id="revoke-asset-id"
                        className="form-input"
                        name="assetId"
                        type="number"
                        placeholder="1234567890"
                        value={form.assetId}
                        onChange={handleChange}
                        disabled={loading}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="revoke-student-address">Student Algorand Address *</label>
                    <input
                        id="revoke-student-address"
                        className="form-input"
                        name="studentAddress"
                        placeholder="ABCDEF1234…"
                        value={form.studentAddress}
                        onChange={handleChange}
                        disabled={loading}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <input
                        type="checkbox"
                        id="revoke-confirm"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent-red)' }}
                    />
                    <label htmlFor="revoke-confirm" style={{ fontSize: '0.875rem', color: 'var(--accent-red)', cursor: 'pointer' }}>
                        I understand this action is irreversible and will permanently revoke the credential.
                    </label>
                </div>
                <button
                    type="submit"
                    className="btn btn-danger btn-full"
                    disabled={!isConnected || loading || !confirmed}
                    id="btn-revoke-credential"
                >
                    {loading ? <><span className="spinner" /> Revoking…</> : '🚫 Revoke Credential'}
                </button>
            </form>

            {result && (
                <div className="result-box" style={{ marginTop: 24 }}>
                    <h4>✅ Credential Revoked</h4>
                    <div className="info-row" style={{ marginTop: 12 }}>
                        <span className="info-label">Transaction</span>
                        <a href={getExplorerUrl('tx', result.txId)} target="_blank" rel="noreferrer" className="info-value">
                            {result.txId?.slice(0, 16)}… ↗
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
