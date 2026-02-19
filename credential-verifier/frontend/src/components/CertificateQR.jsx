import React from "react";
import { QRCodeSVG } from "qrcode.react";

const CertificateQR = ({ nftId }) => {
    const verifyUrl = `http://10.7.11.0:5174/verify?nft_id=${nftId}`;

    return (
        <div>
            <h3>QR Test</h3>
            <p>{verifyUrl}</p>
            <QRCodeSVG
                value={verifyUrl}
                size={220}
                includeMargin={true}
                level="H"
            />
        </div>
    );
};

export default CertificateQR;
