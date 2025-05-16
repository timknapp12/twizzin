import { supabase } from '../supabase/supabaseClient';
import { PublicKey } from '@solana/web3.js';
import * as tweetnacl from 'tweetnacl';

export const generateSecureToken = () => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const generateVerificationMessage = (publicKey: string, nonce: string) => {
  const domain = 'twizzin.app';
  const version = '1';
  const timestamp = Date.now();
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const entropy = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return `${domain}\nVersion: ${version}\nWallet: ${publicKey}\nNonce: ${nonce}\nTimestamp: ${timestamp}\nEntropy: ${entropy}`;
};

export const getDeviceFingerprint = () => {
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    platform: navigator.platform,
    // Add more entropy
    canvas: getCanvasFingerprint(),
    audio: getAudioFingerprint(),
    fonts: getFontFingerprint(),
  };
  return btoa(JSON.stringify(fingerprint));
};

// Add canvas fingerprinting for additional entropy
const getCanvasFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  canvas.width = 200;
  canvas.height = 200;
  
  // Draw some shapes
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.font = '18px Arial';
  ctx.fillText('Twizzin', 10, 50);
  
  return canvas.toDataURL();
};

// Add audio fingerprinting
const getAudioFingerprint = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    return analyser.fftSize.toString();
  } catch {
    return '';
  }
};

// Add font fingerprinting
const getFontFingerprint = () => {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const fontList = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New',
    'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact'
  ];
  
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  const h = document.getElementsByTagName('body')[0];
  
  const s = document.createElement('span');
  s.style.fontSize = testSize;
  s.innerHTML = testString;
  const defaultWidth: { [key: string]: number } = {};
  const defaultHeight: { [key: string]: number } = {};
  
  for (const baseFont of baseFonts) {
    s.style.fontFamily = baseFont;
    h.appendChild(s);
    defaultWidth[baseFont] = s.offsetWidth;
    defaultHeight[baseFont] = s.offsetHeight;
    h.removeChild(s);
  }
  
  const detected: string[] = [];
  for (const font of fontList) {
    let match = false;
    for (const baseFont of baseFonts) {
      s.style.fontFamily = `${font},${baseFont}`;
      h.appendChild(s);
      const matched = (s.offsetWidth !== defaultWidth[baseFont] ||
                      s.offsetHeight !== defaultHeight[baseFont]);
      h.removeChild(s);
      if (matched) {
        match = true;
        break;
      }
    }
    if (match) detected.push(font);
  }
  
  return detected.join(',');
};

export const checkIPRateLimit = async (ip: string) => {
  try {
    const { data, error } = await supabase
      .from('verification_attempts')
      .select('attempt_time')
      .eq('ip_address', ip)
      .gte('attempt_time', new Date(Date.now() - 3600000).toISOString());

    if (error) {
      console.error('Rate limit check failed:', error);
      return false; // Fail closed on error
    }
    
    return data.length < 20;
  } catch (error) {
    console.error('Error checking IP rate limit:', error);
    return false; // Fail closed on error
  }
};

export const getGeolocationData = async (ip: string) => {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    return {
      country: data.country_name,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    console.error('Error getting geolocation:', error);
    return null;
  }
};

// Check for suspicious location changes
export const checkSuspiciousLocation = async (walletAddress: string, newLocation: any) => {
  try {
    const { data: previousLocations } = await supabase
      .from('wallet_verifications')
      .select('geolocation, verified_at')
      .eq('wallet_address', walletAddress)
      .order('verified_at', { ascending: false })
      .limit(1)
      .single();

    if (!previousLocations?.geolocation) return false;

    const prev = previousLocations.geolocation;
    const timeDiff = Date.now() - new Date(previousLocations.verified_at).getTime();
    const distance = calculateDistance(
      prev.latitude,
      prev.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // Calculate velocity in km/h
    const velocity = (distance / (timeDiff / (1000 * 60 * 60)));
    
    // Suspicious if:
    // 1. Distance > 1000km AND time < 24h
    // 2. Velocity > 1000 km/h (typical commercial aircraft speed)
    return (distance > 1000 && timeDiff < 24 * 60 * 60 * 1000) || velocity > 1000;
  } catch (error) {
    console.error('Error checking suspicious location:', error);
    return true; // Err on the side of caution
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number) => {
  return (value * Math.PI) / 180;
};

export const createSession = async (walletAddress: string) => {
  try {
    const sessionToken = generateSecureToken();
    const { error } = await supabase
      .from('sessions')
      .insert({
        wallet_address: walletAddress,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        device_fingerprint: getDeviceFingerprint(),
      });

    if (error) throw error;
    return sessionToken;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const verifySignature = async (
  message: string,
  signature: Uint8Array,
  publicKey: string
): Promise<boolean> => {
  try {
    const pubKey = new PublicKey(publicKey);
    const messageBytes = new TextEncoder().encode(message);
    return tweetnacl.sign.detached.verify(
      messageBytes,
      signature,
      pubKey.toBytes()
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}; 