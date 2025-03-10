import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useState } from "react";

const qrcodeRegionId = "html5qr-code-full-region";

// Creates the configuration object for Html5QrcodeScanner.
function createConfig(props) {
  let config = {};
  if (props.fps) {
    config.fps = props.fps;
  }
  if (props.qrbox) {
    config.qrbox = props.qrbox;
  }
  if (props.aspectRatio) {
    config.aspectRatio = props.aspectRatio;
  }
  if (props.disableFlip !== undefined) {
    config.disableFlip = props.disableFlip;
  }
  return config;
}

export default function Html5QrcodePlugin(props) {
  const [qrResult, setQrResult] = useState("");

  // Wrap the success callback to update our state as well.
  const onScanSuccess = (decodedText, decodedResult) => {
    setQrResult(decodedText);
    if (props.qrCodeSuccessCallback) {
      props.qrCodeSuccessCallback(decodedText, decodedResult);
    }
  };

  useEffect(() => {
    const config = createConfig(props);
    const verbose = props.verbose === true;
    if (!props.qrCodeSuccessCallback) {
      throw "qrCodeSuccessCallback is required callback.";
    }
    const html5QrcodeScanner = new Html5QrcodeScanner(
      qrcodeRegionId,
      config,
      verbose
    );
    html5QrcodeScanner.render(onScanSuccess, props.qrCodeErrorCallback);

    return () => {
      html5QrcodeScanner.clear().catch((error) => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [props]);

  return (
    <div>
      <div id={qrcodeRegionId} />
      <div style={{ marginTop: "1rem" }}>
        <label htmlFor="qr-code-result">QR Code Result:</label>
        <input
          type="text"
          id="qr-code-result"
          value={qrResult}
          readOnly
          placeholder="Scan a QR code..."
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
        />
      </div>
    </div>
  );
}