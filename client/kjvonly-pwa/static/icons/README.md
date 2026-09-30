# ICONS

```
for size in 36 48 72 96 120 144 152 167 180 192 512 1024; do rsvg-convert -w "$size" -h "$size" app-icon.svg > "${size}X${size}_app.png"; done


rsvg-convert -w 16 -h 16 app-icon.svg > favicon-16x16.png
rsvg-convert -w 32 -h 32 app-icon.svg > favicon-32x32.png
rsvg-convert -w 48 -h 48 app-icon.svg > favicon-48x48.png

magick favicon-16x16.png favicon-32x32.png favicon-48x48.png favicon.ico

# apple
rsvg-convert -w 180 -h 180 app-icon.svg > apple-touch-icon.png

## for apple background
rsvg-convert -w 512 -h 512 -b '#050505' app-icon.svg > app-icon-512.png
rsvg-convert -w 1024 -h 1024 -b '#050505' app-icon.svg > app-icon-1024.png

rsvg-convert -w 192 -h 192 -b '#050505' app-icon.svg > app-icon-maskable-192.png
rsvg-convert -w 512 -h 512 -b '#050505' app-icon.svg > app-icon-maskable-512.png
```