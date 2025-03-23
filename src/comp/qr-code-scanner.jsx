import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";

const qrcodeRegionId = "html5qr-code-full-region";

export default function Html5QrcodePlugin(props) {
  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(qrcodeRegionId, {
      ...props,
      fps: 10, qrbox: 250,
      useBarCodeDetectorIfSupported: false,
      rememberLastUsedCamera: false,
      videoConstraints: { facingMode: "environment" },
    });

    html5QrcodeScanner.render((decodedText) => {
      props.qrCodeSuccessCallback(decodedText);
      html5QrcodeScanner.clear();
    }, props.qrCodeErrorCallback);

    return () => {
      html5QrcodeScanner.clear().catch((error) => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [props]);

  return <div id={qrcodeRegionId}></div>;
}
