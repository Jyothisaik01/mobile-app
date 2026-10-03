import { registerRootComponent } from 'expo';

// Catch unhandled JS exceptions globally so release APK does not abruptly terminate/close
if (global.ErrorUtils) {
  const previousHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('Captured Global Error:', error, 'isFatal:', isFatal);
    if (__DEV__ && previousHandler) {
      previousHandler(error, isFatal);
    }
  });
}

import App from './App';

registerRootComponent(App);
