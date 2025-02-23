import CryptoJS from "crypto-js";

// Generate random bytes
export function randomBytes(length) {
    return CryptoJS.lib.WordArray.random(length);
}

// Derive a key using PBKDF2
function deriveKey(password, salt, iterations = 100, keySize = 256) {
    return CryptoJS.PBKDF2(password, salt, {
        keySize: keySize / 32,
        iterations: iterations,
        hasher: CryptoJS.algo.SHA512
    });
}

// Encrypt data using AES-CBC with PKCS7 padding
export function encrypt(password = "", data = "") {
    const salt = randomBytes(32);
    const iv = randomBytes(16);
    const key = deriveKey(password, salt);
    const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    // Concatenate salt, iv, and ciphertext
    return salt.concat(iv).concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
}

// Decrypt data using AES-CBC with PKCS7 padding
export function decrypt(password = "", data = "") {
    const rawData = CryptoJS.enc.Base64.parse(data);
    const salt = CryptoJS.lib.WordArray.create(rawData.words.slice(0, 8));
    const iv = CryptoJS.lib.WordArray.create(rawData.words.slice(8, 12));
    const ciphertext = CryptoJS.lib.WordArray.create(rawData.words.slice(12));
    const key = deriveKey(password, salt);
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

// SHA-512 Hash with salt and iterations
export function hash(data, salt = "10", times = 1) {
    let hash = CryptoJS.SHA512(data + salt);
    for (let i = 1; i < times; i++) {
        hash = CryptoJS.SHA512(hash + salt);
    }
    return hash.toString(CryptoJS.enc.Hex);
}

export function basicHash(data) {
    return CryptoJS.SHA512(data).toString(CryptoJS.enc.Hex);
}