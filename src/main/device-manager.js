const { runShell, runShellAsUser } = require('./shell-commands');

function parseSize(sizeStr) {
  if (!sizeStr) return 0;
  const match = String(sizeStr).trim().replace(',', '.').match(/^([0-9.]+)\s*([KMGT]?)$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] || '').toUpperCase();
  const multipliers = { '': 1, 'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024, 'T': 1024 * 1024 * 1024 * 1024 };
  return Math.floor(value * (multipliers[unit] || 1));
}

function parseLsusb(stdout) {
  const lines = stdout.trim().split('\n');
  const devices = [];
  for (const line of lines) {
    const match = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-fA-F]{4}):([0-9a-fA-F]{4}) (.+)/);
    if (match) {
      devices.push({
        bus: match[1],
        device: match[2],
        vendorId: match[3],
        productId: match[4],
        description: match[5].trim()
      });
    }
  }
  return devices;
}

async function listUsbDevices() {
  try {
    const lsblkResult = await runShell('lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL,LABEL,FSTYPE,RM,STATE', 10000);
    const lsusbResult = await runShell('lsusb', 5000);
    
    if (lsblkResult.code !== 0) throw new Error(lsblkResult.stderr || 'Error listando dispositivos');
    
    const data = JSON.parse(lsblkResult.stdout);
    const usbHardware = parseLsusb(lsusbResult.stdout || '');
    
    const blockDevices = data.blockdevices.filter((d) => {
      const isRemovable = d.rm === true || d.rm === 1 || d.rm === '1';
      const hasUsbModel = d.model && d.model.toLowerCase().includes('usb');
      const realSize = parseSize(d.size) > 1024 * 1024;
      return (isRemovable || hasUsbModel) && realSize;
    });
    
    const partitionDevices = [];
    blockDevices.forEach(device => {
      if (device.children && device.children.length > 0) {
        device.children.forEach(child => {
          partitionDevices.push({
            ...child,
            type: 'partition',
            parentDevice: device.name,
            usbInfo: usbHardware.find(h => 
              h.description.toLowerCase().includes((device.model || '').toLowerCase()) ||
              h.description.toLowerCase().includes('usb')
            ) || null
          });
        });
      }
    });
    
    const usbDevices = blockDevices.map(d => ({
      ...d,
      type: 'block',
      usbInfo: usbHardware.find(h => 
        h.description.toLowerCase().includes((d.model || '').toLowerCase()) ||
        h.description.toLowerCase().includes('usb')
      ) || null
    }));
    
    partitionDevices.forEach(p => {
      usbDevices.push(p);
    });
    
    const usbOnly = usbHardware.filter(h => 
      h.description.toLowerCase().includes('storage') ||
      h.description.toLowerCase().includes('flash') ||
      h.description.toLowerCase().includes('reader') ||
      h.description.toLowerCase().includes('mass')
    ).filter(h => !usbDevices.find(d => d.usbInfo && d.usbInfo.device === h.device));
    
    usbOnly.forEach(h => {
      usbDevices.push({
        type: 'hardware',
        name: `usb-${h.bus}-${h.device}`,
        size: 'N/A',
        model: h.description,
        mountpoint: null,
        label: null,
        fstype: null,
        rm: true,
        state: 'connected',
        usbInfo: h
      });
    });
    
    return { success: true, devices: usbDevices };
  } catch (e) {
    return { success: false, error: e.message || e.toString() };
  }
}

module.exports = {
  parseSize,
  parseLsusb,
  listUsbDevices
};
