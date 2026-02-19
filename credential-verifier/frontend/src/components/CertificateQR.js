import React from "react";
import QRCode from "qrcode.react";

const CertificateQR = ({ nftId }) => {
  const verifyUrl = `http://localhost:5174/verify?nft_id=${nftId}`;

  return (
    <div>
      {/* Debug line */}
      <p>{verifyUrl}</p>

      <QRCode value={verifyUrl} size={200} />
    </div>
  );
};

export default CertificateQR;
