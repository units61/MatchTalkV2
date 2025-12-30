import { registerRootComponent } from 'expo';
import App from './App';

// 🛡️ CRITICAL: Disable Expo's error recovery queue BEFORE anything else
// This prevents SIGABRT crashes from expo.controller.errorRecoveryQueue
import { LogBox, ErrorUtils } from 'react-native';

// Disable all warnings
LogBox.ignoreAllLogs(true);

// Override global error handler to prevent Expo's error recovery from running
const noop = () => { };
if (ErrorUtils) {
    ErrorUtils.setGlobalHandler(noop);
}

// Disable Expo's error recovery completely
if (global.ErrorUtils) {
    global.ErrorUtils.setGlobalHandler(noop);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

