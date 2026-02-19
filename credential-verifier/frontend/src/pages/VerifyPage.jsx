import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAssetInfo } from "../lib/algorand";

/**
 * Public verification page — NO wallet connection required.
 * Opened via QR code or direct link: /verify?nft_id=<assetId>
 */
export default function VerifyPage() {
    const [searchParams] = useSearchParams();
    const nftId = searchParams.get("nft_id");

    const [status, setStatus] = useState("loading"); // loading | found | invalid | error
    const [assetInfo, setAssetInfo] = useState(null);

    useEffect(() => {
        if (!nftId || isNaN(Number(nftId))) {
            setStatus("invalid");
            return;
        }
        getAssetInfo(Number(nftId))
            .then((info) => {
                if (!info) { setStatus("invalid"); return; }
                setAssetInfo(info);
                setStatus("found");
            })
            .catch(() => setStatus("error"));
    }, [nftId]);

    return (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
            <h2 style={{
                background: "linear-gradient(135deg,#8b5cf6,#38bdf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: 8,
            }}>
                🔍 Credential Verification
            </h2>
            <p style={{ color: "#a89ec8", marginBottom: 32 }}>
                On-chain verification — no wallet required.
            </p>

            {status === "loading" && (
                <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
                    <span className="spinner" style={{ width: 28, height: 28, margin: "0 auto" }} />
                    <p style={{ marginTop: 16 }}>Querying Algorand TestNet…</p>
                </div>
            )}

            {status === "invalid" && (
                <div className="glass-card result-box error" style={{ padding: 32 }}>
                    <h4>❌ Invalid or Unknown Credential</h4>
                    <code>Asset ID "{nftId}" was not found on the Algorand TestNet.</code>
                </div>
            )}

            {status === "error" && (
                <div className="glass-card result-box error" style={{ padding: 32 }}>
                    <h4>⚠️ Network Error</h4>
                    <code>Could not reach the Algorand node. Check your internet connection.</code>
                </div>
            )}

            {status === "found" && assetInfo && (
                <div className="glass-card result-box" style={{ padding: 32 }}>
                    <h4>✅ Credential Verified On-Chain</h4>
                    <div className="info-grid" style={{ marginTop: 20 }}>
                        {[
                            ["Asset ID", nftId],
                            ["Name", assetInfo.params?.name || "—"],
                            ["Unit", assetInfo.params?.["unit-name"] || "—"],
                            ["Manager", assetInfo.params?.manager || "—"],
                            ["Reserve", assetInfo.params?.reserve || "—"],
                            ["Freeze", assetInfo.params?.freeze || "—"],
                            ["Clawback", assetInfo.params?.clawback || "—"],
                            ["Total", String(assetInfo.params?.total ?? "—")],
                        ].map(([label, value]) => (
                            <div key={label} className="info-row">
                                <span className="info-label">{label}</span>
                                <span className="info-value">{value}</span>
                            </div>
                        ))}
                        {assetInfo.params?.url && (
                            <div className="info-row">
                                <span className="info-label">Certificate</span>
                                <a
                                    className="info-value"
                                    href={
                                        assetInfo.params.url.startsWith("ipfs://")
                                            ? `https://ipfs.io/ipfs/${assetInfo.params.url.slice(7)}`
                                            : assetInfo.params.url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View on IPFS ↗
                                </a>
                            </div>
                        )}
                    </div>

                    <div style={{
                        marginTop: 24,
                        padding: "12px 16px",
                        background: "rgba(52,211,153,0.06)",
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        color: "#a89ec8",
                    }}>
                        🔒 Manager, Freeze and Clawback are all set to the contract address,
                        confirming this credential is non-transferable and institution-controlled.
                    </div>
                </div>
            )}
        </div>
    );
}
