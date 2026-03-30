import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

export function getClaudeSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return null;
    }
    const content = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading claude settings:', error);
    return null;
  }
}

export function setClaudeEnv(envPayload: Record<string, any>) {
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Step 1: Backup the previous file if it exists
    if (fs.existsSync(SETTINGS_PATH)) {
      const backupPath = SETTINGS_PATH + '.bak';
      fs.copyFileSync(SETTINGS_PATH, backupPath);
    }

    // Step 2: Read current and merge specifically inside the 'env' root property.
    let settings = getClaudeSettings() || {};
    settings.env = { ...envPayload }; // Directly replace the 'env' layer to guarantee clean transition
    
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing claude settings:', error);
    return false;
  }
}
