# Videos de fondo (self-hosted)

Coloca aquí los MP4 H.264 para producción. Los posters JPEG van en `public/images/posters/`. En desarrollo el frontend usa el CDN de Pexels por defecto.

## Archivos requeridos

| Archivo | Uso |
|---------|-----|
| `hero.mp4` | Hero móvil / SD (640×360 recomendado) |
| `hero-hd.mp4` | Hero escritorio / retina (1920×1080) |
| `feature-personalizable.mp4` | Sección «Personalizable» |
| `feature-production.mp4` | Sección «Producción» |
| `feature-why.mp4` | Sección «Por qué» |

Posters (en `public/images/posters/`):

| Archivo | Uso |
|---------|-----|
| `hero.jpg` | Poster hero |
| `feature-personalizable.jpg` | Poster feature 1 |
| `feature-production.jpg` | Poster feature 2 |
| `feature-why.jpg` | Poster feature 3 |

## Descarga desde Pexels (referencia)

```bash
mkdir -p public/videos public/images/posters

curl -L -o public/videos/hero.mp4 "https://videos.pexels.com/video-files/20136155/20136155-sd_640_360_30fps.mp4"
curl -L -o public/videos/hero-hd.mp4 "https://videos.pexels.com/video-files/20136155/20136155-hd_1920_1080_60fps.mp4"
curl -L -o public/videos/feature-personalizable.mp4 "https://videos.pexels.com/video-files/3254066/3254066-hd_1920_1080_25fps.mp4"
curl -L -o public/videos/feature-production.mp4 "https://videos.pexels.com/video-files/8738397/8738397-hd_1920_1080_25fps.mp4"
curl -L -o public/videos/feature-why.mp4 "https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4"

# Posters: extraer primer frame con ffmpeg (las URLs de fotos Pexels pueden cambiar)
ffmpeg -y -i public/videos/hero.mp4 -frames:v 1 -q:v 2 public/images/posters/hero.jpg
ffmpeg -y -i public/videos/feature-personalizable.mp4 -frames:v 1 -q:v 2 public/images/posters/feature-personalizable.jpg
ffmpeg -y -i public/videos/feature-production.mp4 -frames:v 1 -q:v 2 public/images/posters/feature-production.jpg
ffmpeg -y -i public/videos/feature-why.mp4 -frames:v 1 -q:v 2 public/images/posters/feature-why.jpg
```

## Forzar rutas locales en desarrollo

```bash
NEXT_PUBLIC_SELF_HOST_MEDIA=true pnpm dev
```
