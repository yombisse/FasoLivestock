/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Désactiver l'affichage des erreurs dans l'interface mobile pour la présentation
LogBox.ignoreAllLogs();

AppRegistry.registerComponent(appName, () => App);