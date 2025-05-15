import { supabase } from '../supabase/supabaseClient';
import { PublicKey } from '@solana/web3.js';
import * as tweetnacl from 'tweetnacl';

export const generateSecureToken = () => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
  };
  return btoa(JSON.stringify(fingerprint));
};

export const checkIPRateLimit = async (ip: string) => {
  try {
    const { data, error } = await supabase
      .from('verification_attempts')
      .select('attempt_time')
      .eq('ip_address', ip)
      .gte('attempt_time', new Date(Date.now() - 3600000).toISOString());

    if (error) {
      console.warn('Rate limit check failed:', error);
      return true;
    }
    
    if (!data) {
      return true;
    }
    
    return data.length < 20; 
  } catch (error) {
    console.error('Error checking IP rate limit:', error);
    return true; 
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
      .select('geolocation')
      .eq('wallet_address', walletAddress)
      .order('verified_at', { ascending: false })
      .limit(1)
      .single();

    if (!previousLocations?.geolocation) return false;

    const prev = previousLocations.geolocation;
    const distance = calculateDistance(
      prev.latitude,
      prev.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // If distance is more than 1000km and time difference is less than 24 hours
    return distance > 1000;
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