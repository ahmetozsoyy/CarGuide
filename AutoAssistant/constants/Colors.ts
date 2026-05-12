export const Colors = {
  // Core backgrounds
  background: '#0A0E17',     // Deep navy-black
  surface: '#141922',        // Card surfaces
  surfaceLight: '#1C2333',   // Elevated surfaces
  
  // Brand colors
  primary: '#6366F1',        // Modern indigo
  primaryLight: '#818CF8',   // Lighter indigo
  primaryDark: '#4F46E5',    // Deeper indigo
  secondary: '#06D6A0',     // Vibrant mint green
  accent: '#F472B6',         // Soft pink accent
  
  // Text
  text: '#F1F5F9',           // Crisp white
  textSecondary: '#CBD5E1',  // Soft gray
  textMuted: '#64748B',      // Muted slate
  
  // Borders & dividers
  border: '#1E293B',         // Subtle border
  borderLight: '#334155',    // Visible border
  
  // Status colors
  success: '#06D6A0',
  warning: '#FBBF24',
  danger: '#F43F5E',
  info: '#38BDF8',

  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#6366F1', '#8B5CF6'] as const,
  gradientSuccess: ['#06D6A0', '#34D399'] as const,
  gradientDanger: ['#F43F5E', '#FB7185'] as const,
  gradientDark: ['#0A0E17', '#141922'] as const,
  gradientCard: ['#141922', '#1C2333'] as const,
};
