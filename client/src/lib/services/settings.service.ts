import uuid4 from 'uuid4';
import { type Settings, newSettings } from '../models/settings.model';



/**
 * Settings apply users settings to DOM. On update the settings module will
 * call this service to update the DOM with desired settings e.g. color, font
 */
class SettingsService {
  myid = uuid4()
  subscribers: any = {}


  subscribe(subID: any, fn: any) {
    this.subscribers[subID] = fn;
  }

  unsubscribe(subID: any) {
    delete this.subscribers[subID]
  }


  applySettings() {
    let cs = this.getSettings();
    let html = document.getElementById('kjvonly-html');
    if (cs.isDarkTheme) {
      html?.setAttribute('data-theme', `color-theme-dark-${cs.colorTheme}`);
    } else {
      html?.setAttribute('data-theme', `color-theme-${cs.colorTheme}`);
    }

    html?.setAttribute('font-family', cs.fontFamily);

    html?.setAttribute(
      'style',
      `font-size: ${cs.fontSize}px; font-weight: ${cs.fontWeight};`
    );

    Object.keys(this.subscribers).forEach((k: string) => {
      let fn = this.subscribers[k];
      fn(cs)
    });

  }

  getSettings(): Settings {
    let cs = localStorage.getItem('settings');
    if (cs != null) {
      let settings: Settings | null = JSON.parse(cs);
      if (settings) {
        return settings;
      }
    }
    return newSettings();
  }
}

export let settingsService = new SettingsService();
