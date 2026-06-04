/**
 * Background video URLs.
 * Production (or NEXT_PUBLIC_SELF_HOST_MEDIA=true): /public/videos — see public/videos/README.md.
 * Development: Pexels CDN fallback.
 */

const USE_SELF_HOSTED =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_SELF_HOST_MEDIA === "true";

const PEXELS = {
  hero: {
    src: "https://videos.pexels.com/video-files/20136155/20136155-sd_640_360_30fps.mp4",
    srcHd: "https://videos.pexels.com/video-files/20136155/20136155-hd_1920_1080_60fps.mp4",
    poster:
      "https://images.pexels.com/photos/7679619/pexels-photo-7679619.jpeg?auto=compress&cs=tinysrgb&w=1280",
  },
  featurePersonalizable: {
    src: "https://videos.pexels.com/video-files/3254066/3254066-hd_1920_1080_25fps.mp4",
    poster:
      "https://images.pexels.com/photos/7679619/pexels-photo-7679619.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  featureProduction: {
    src: "https://videos.pexels.com/video-files/8738397/8738397-hd_1920_1080_25fps.mp4",
    poster:
      "https://images.pexels.com/photos/4483610/pexels-photo-4483610.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  featureWhy: {
    src: "https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4",
    poster:
      "https://images.pexels.com/photos/6311657/pexels-photo-6311657.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
} as const;

export const MEDIA = USE_SELF_HOSTED
  ? ({
      hero: {
        src: "/videos/hero.mp4",
        srcHd: "/videos/hero-hd.mp4",
        poster: "/images/posters/hero.jpg",
      },
      featurePersonalizable: {
        src: "/videos/feature-personalizable.mp4",
        poster: "/images/posters/feature-personalizable.jpg",
      },
      featureProduction: {
        src: "/videos/feature-production.mp4",
        poster: "/images/posters/feature-production.jpg",
      },
      featureWhy: {
        src: "/videos/feature-why.mp4",
        poster: "/images/posters/feature-why.jpg",
      },
    } as const)
  : PEXELS;
