/**
 * Animation utilities and keyframes
 */

export const animations = {
  // Durations
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Keyframe animations
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideUp: {
      from: { transform: 'translateY(20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideDown: {
      from: { transform: 'translateY(-20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideLeft: {
      from: { transform: 'translateX(20px)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 },
    },
    slideRight: {
      from: { transform: 'translateX(-20px)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    scaleOut: {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.95)', opacity: 0 },
    },
    glow: {
      '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
      '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(168, 85, 247, 0.6)' },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
  },
} as const;

// Animation presets
export const animationPresets = {
  fadeIn: `${animations.keyframes.fadeIn} ${animations.duration.normal} ${animations.easing.easeOut}`,
  fadeOut: `${animations.keyframes.fadeOut} ${animations.duration.fast} ${animations.easing.easeIn}`,
  slideUp: `${animations.keyframes.slideUp} ${animations.duration.normal} ${animations.easing.easeOut}`,
  slideDown: `${animations.keyframes.slideDown} ${animations.duration.normal} ${animations.easing.easeOut}`,
  scaleIn: `${animations.keyframes.scaleIn} ${animations.duration.normal} ${animations.easing.spring}`,
  glow: `${animations.keyframes.glow} 2s ease-in-out infinite`,
  pulse: `${animations.keyframes.pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
} as const;

