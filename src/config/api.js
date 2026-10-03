import { Platform } from 'react-native';

// Local PC Wi-Fi IP address detected on your system
export const LOCAL_DEV_IP = '192.168.1.12';
export const LOCAL_DEV_PORT = '3000';

// Change USE_PROD to true when switching to your deployed cloud backend
export const USE_PROD = false;

export const PROD_API_URL = 'https://inventoryadmin24.vercel.app';

const getDevUrl = () => {
  // If running inside Android Studio emulator, 10.0.2.2 points to host PC
  // If running on a physical Android phone over Wi-Fi, uses your PC's LAN IP
  return `http://${LOCAL_DEV_IP}:${LOCAL_DEV_PORT}`;
};

export const API_BASE_URL = USE_PROD ? PROD_API_URL : getDevUrl();

export const BASE_URL = API_BASE_URL;

export default API_BASE_URL;
