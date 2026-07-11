const { runShell } = require('./shell-commands');

async function analyzeContent(mountpoint) {
  try {
    if (!mountpoint || mountpoint === 'no montado' || mountpoint === null) {
      return { success: false, output: 'El dispositivo no está montado. Monta el dispositivo primero.' };
    }

    const stats = {
      videos: 0,
      images: 0,
      audio: 0,
      documents: 0,
      other: 0,
      total: 0
    };

    const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ts', 'mpg', 'mpeg'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'svg', 'ico', 'heic', 'raw', 'cr2', 'nef'];
    const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'aiff', 'alac'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'csv', 'json', 'xml', 'html', 'md'];

    const countByExtension = async (extensions) => {
      const extPattern = extensions.map(ext => `*.${ext}`).join(' -o -name ');
      const cmd = `find "${mountpoint}" -type f \\( -name ${extPattern} \\) 2>/dev/null | wc -l`;
      const result = await runShell(cmd, 30000);
      return parseInt(result.stdout.trim()) || 0;
    };

    stats.videos = await countByExtension(videoExtensions);
    stats.images = await countByExtension(imageExtensions);
    stats.audio = await countByExtension(audioExtensions);
    stats.documents = await countByExtension(documentExtensions);

    const totalResult = await runShell(`find "${mountpoint}" -type f 2>/dev/null | wc -l`, 30000);
    stats.total = parseInt(totalResult.stdout.trim()) || 0;

    stats.other = stats.total - stats.videos - stats.images - stats.audio - stats.documents;

    return { success: true, stats };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

async function findEmptyFolders(mountpoint) {
  try {
    if (!mountpoint || mountpoint === 'no montado' || mountpoint === null) {
      return { success: false, output: 'El dispositivo no está montado.' };
    }

    const cmd = `find "${mountpoint}" -type d -empty 2>/dev/null`;
    const result = await runShell(cmd, 30000);
    
    if (result.code !== 0) {
      return { success: false, output: result.stderr || 'Error buscando carpetas vacías' };
    }

    const folders = result.stdout.trim().split('\n').filter(f => f);
    return { success: true, folders };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

async function findDuplicateFiles(mountpoint) {
  try {
    if (!mountpoint || mountpoint === 'no montado' || mountpoint === null) {
      return { success: false, output: 'El dispositivo no está montado.' };
    }

    const cmd = `fdupes -r "${mountpoint}" 2>/dev/null | head -n 100`;
    const result = await runShell(cmd, 60000);
    
    if (result.code !== 0) {
      const cmd2 = `find "${mountpoint}" -type f -exec du {} \\; 2>/dev/null | sort -n | uniq -d -w 32`;
      const result2 = await runShell(cmd2, 60000);
      return { success: true, duplicates: result2.stdout.trim().split('\n').filter(f => f) };
    }

    const duplicates = result.stdout.trim().split('\n').filter(f => f);
    return { success: true, duplicates };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

async function findLargeFiles(mountpoint) {
  try {
    if (!mountpoint || mountpoint === 'no montado' || mountpoint === null) {
      return { success: false, output: 'El dispositivo no está montado.' };
    }

    const cmd = `find "${mountpoint}" -type f -exec du -h {} \\; 2>/dev/null | sort -rh | head -n 20`;
    const result = await runShell(cmd, 30000);
    
    if (result.code !== 0) {
      return { success: false, output: result.stderr || 'Error buscando archivos grandes' };
    }

    const files = result.stdout.trim().split('\n').filter(f => f).map(line => {
      const parts = line.trim().split('\t');
      if (parts.length >= 2) {
        return { size: parts[0], path: parts[1] };
      }
      return null;
    }).filter(f => f);

    return { success: true, files };
  } catch (e) {
    return { success: false, output: (e.stdout || '') + (e.stderr || '') };
  }
}

module.exports = {
  analyzeContent,
  findEmptyFolders,
  findDuplicateFiles,
  findLargeFiles
};
