import { useState, useEffect, useCallback } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';

const peraWallet = new PeraWalletConnect({ shouldShowSignTxnToast: true });

export function useWallet() {
    const [accounts, setAccounts] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        // Auto-reconnect intentionally removed.
        // Wallet connects only when user clicks "Connect Wallet".
        // This prevents MetaMask / Pera Wallet from hijacking page load on mobile.
    }, []);

    function handleDisconnect() {
        setAccounts([]);
    }

    const connect = useCallback(async () => {
        setIsConnecting(true);
        try {
            const newAccounts = await peraWallet.connect();
            peraWallet.connector?.on('disconnect', handleDisconnect);
            setAccounts(newAccounts);
            return newAccounts;
        } catch (e) {
            if (e?.data?.type !== 'CONNECT_MODAL_CLOSED') {
                console.error('Wallet connect error:', e);
            }
            return [];
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        peraWallet.disconnect();
        setAccounts([]);
    }, []);

    /**
     * Returns a Pera-compatible transaction signer function.
     */
    const signer = useCallback(
        async (txnGroup, indexesToSign) => {
            const txnsToSign = txnGroup.map((txn, idx) => {
                if (indexesToSign.includes(idx)) {
                    return { txn, signers: [accounts[0]] };
                }
                return { txn, signers: [] };
            });
            const signed = await peraWallet.signTransaction([txnsToSign]);
            return signed;
        },
        [accounts]
    );

    return {
        accounts,
        activeAccount: accounts[0] || null,
        isConnecting,
        connect,
        disconnect,
        signer,
        isConnected: accounts.length > 0,
    };
}
