import { execSync } from 'child_process';

export interface AptPackage {
  name: string;
  version: string;
  description: string;
  size: string;
  installed: boolean;
  section: string;
}

export function searchAptPackages(query: string): AptPackage[] {
  try {
    // Search for packages with a query, limit to 50 for performance
    const output = execSync(`apt-cache search "${query}" | head -n 50`).toString();
    const lines = output.split('\n').filter(line => line.trim() !== '');
    
    return lines.map(line => {
      const [name] = line.split(' - ');
      return getPackageDetails(name.trim());
    }).filter(pkg => pkg !== null) as AptPackage[];
  } catch (error) {
    console.error('Error searching apt packages:', error);
    return [];
  }
}

export function getPackageDetails(name: string): AptPackage | null {
  try {
    const output = execSync(`apt-cache show ${name}`).toString();
    const lines = output.split('\n');
    
    const details: any = { name };
    lines.forEach(line => {
      if (line.startsWith('Version: ')) details.version = line.replace('Version: ', '');
      if (line.startsWith('Description-en: ')) details.description = line.replace('Description-en: ', '');
      else if (line.startsWith('Description: ')) details.description = line.replace('Description: ', '');
      if (line.startsWith('Size: ')) details.size = formatBytes(parseInt(line.replace('Size: ', '')));
      if (line.startsWith('Section: ')) details.section = line.replace('Section: ', '');
    });

    // Check if installed
    try {
      execSync(`dpkg -s ${name} 2>/dev/null`);
      details.installed = true;
    } catch {
      details.installed = false;
    }

    return details as AptPackage;
  } catch {
    return null;
  }
}

export function installPackage(name: string): boolean {
  try {
    // Note: This requires sudo permissions without password or running as root
    execSync(`sudo apt-get install -y ${name}`);
    return true;
  } catch (error) {
    console.error(`Error installing package ${name}:`, error);
    return false;
  }
}

export function uninstallPackage(name: string): boolean {
  try {
    execSync(`sudo apt-get remove -y ${name}`);
    return true;
  } catch (error) {
    console.error(`Error uninstalling package ${name}:`, error);
    return false;
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
