# USB Tools Pro (Electron)

Aplicación de escritorio para gestionar unidades USB en Linux: liberar procesos bloqueantes, analizar, reparar y formatear en FAT32 o NTFS.

## Características

- **Liberar USB**: mata procesos con `fuser` y desmonta con `umount -l`.
- **Analizar USB**: muestra `blkid`, `df -h`, `fsck -n` y `smartctl -H`.
- **Reparar USB**: ejecuta `fsck -y` para FAT/exFAT o `ntfsfix` para NTFS.
- **Formatear USB**: formatea en FAT32 (`mkfs.vfat -F 32`) o NTFS (`mkfs.ntfs -f`).
- Interfaz glassmorphism moderna y responsive.

## Requisitos

- Linux (Peppermint OS, Ubuntu, Debian, etc.)
- Node.js >= 18
- `npm` o `yarn`
- Paquetes del sistema: `sudo`, `lsblk`, `fuser` (en `psmisc`), `umount`, `blkid`, `fsck`, `mkfs.vfat`, `mkfs.ntfs`, `ntfsfix`, `ntfs-3g`, `smartmontools` (opcional)

## Instalación

```bash
# Entra al proyecto
cd /home/pmint/CascadeProjects/usb-tools-electron

# Instala dependencias
npm install

# Ejecuta la app
npm start
```

## Permisos sudo

Para evitar escribir la contraseña cada vez, añade en `/etc/sudoers` (usando `sudo visudo`):

```
pmint ALL=(ALL) NOPASSWD: /usr/bin/fuser, /bin/umount, /usr/bin/umount, /bin/lsblk, /sbin/blkid, /sbin/fsck, /sbin/fsck.vfat, /usr/sbin/fsck.vfat, /sbin/mkfs.vfat, /usr/sbin/mkfs.vfat, /sbin/mkfs.ntfs, /usr/sbin/mkfs.ntfs, /usr/bin/ntfsfix, /usr/sbin/smartctl, /usr/bin/lsblk
```

Ajusta los paths según los binarios de tu distribución. Para verificar:

```bash
which fuser umount lsblk blkid fsck fsck.vfat mkfs.vfat mkfs.ntfs ntfsfix smartctl
```

## Uso

1. Conecta una USB.
2. Haz clic en **Refrescar** para verla en el selector.
3. Elige una acción en el menú lateral y presiona el botón correspondiente.
4. Revisa la consola de operaciones para ver el resultado.

## Advertencia

- Las acciones de **reparar** y **formatear** pueden eliminar o modificar datos. Asegúrate de seleccionar el dispositivo correcto.
- `smartctl` es opcional; si no está instalado, el análisis mostrará un mensaje indicándolo.

## Estructura

```
usb-tools-electron/
├── main.js        # Proceso principal y comandos del sistema
├── preload.js     # API segura expuesta al renderer
├── renderer.js    # Lógica de la interfaz
├── index.html     # UI glassmorphism
├── styles.css     # Estilos
└── package.json   # Dependencias
```
