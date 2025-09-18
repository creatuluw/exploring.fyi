# Explore.fyi Design Guide

*Based on Gray HTML Template - Professional, Clean, Modern Design System*

## Overview

This design guide establishes the visual identity and component standards for Explore.fyi, following the sophisticated and minimalist aesthetic of the Gray template. Our design prioritizes clarity, accessibility, and professional appeal while maintaining a modern, tech-forward appearance suitable for an AI-powered learning platform.

## Design Philosophy

### Core Principles

1. **Sophisticated Minimalism** - Clean interfaces with purposeful whitespace
2. **Professional Clarity** - Information hierarchy that guides users naturally
3. **Modern Elegance** - Contemporary design patterns with subtle sophistication
4. **Accessible by Design** - WCAG 2.1 compliant with excellent contrast ratios
5. **Performance First** - Lightweight components that load fast and perform smoothly

### Brand Personality

- **Intelligent** - Reflects the AI-powered nature of the platform
- **Professional** - Suitable for serious learners and educational contexts
- **Approachable** - Friendly without being casual
- **Reliable** - Instills confidence in the learning experience
- **Modern** - Contemporary and forward-thinking

## Color System

### Primary Palette

```css
/* Zinc Scale - Primary Neutral Palette */
--color-zinc-50: #fafafa;    /* Background tints */
--color-zinc-100: #f4f4f5;   /* Light backgrounds */
--color-zinc-200: #e4e4e7;   /* Borders, dividers */
--color-zinc-300: #d4d4d8;   /* Disabled states */
--color-zinc-400: #a1a1aa;   /* Placeholder text */
--color-zinc-500: #71717a;   /* Secondary text */
--color-zinc-600: #52525b;   /* Body text */
--color-zinc-700: #3f3f46;   /* Headings */
--color-zinc-800: #27272a;   /* Primary actions */
--color-zinc-900: #18181b;   /* High contrast text */
--color-zinc-950: #09090b;   /* Maximum contrast */
```

### Accent Colors

```css
/* Emerald - Success & Positive Actions */
--color-emerald-500: #10b981; /* Success states, confirmations */
--color-emerald-600: #059669; /* Hover states for success */

/* Rose - Errors & Warnings */
--color-rose-500: #f43f5e;    /* Error states, destructive actions */
--color-rose-600: #e11d48;    /* Hover states for errors */

/* Blue - Information & Links */
--color-blue-500: #3b82f6;    /* Links, info states */
--color-blue-600: #2563eb;    /* Active link states */
```

### Background System

```css
/* Page Backgrounds */
--bg-primary: var(--color-white);        /* Main content areas */
--bg-secondary: var(--color-zinc-50);    /* Page backgrounds */
--bg-tertiary: var(--color-zinc-100);    /* Card backgrounds */

/* Interactive Backgrounds */
--bg-interactive: var(--color-zinc-800); /* Primary buttons */
--bg-interactive-hover: var(--color-zinc-900); /* Button hover */
--bg-muted: var(--color-zinc-100);       /* Muted sections */
```

## Typography

### Font System

**Primary Font Family:** Inter (Google Fonts)
**Secondary Font Family:** Inter Tight (Headings and emphasis)

```css
--font-inter: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-inter-tight: 'Inter Tight', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale

```css
/* Refined type scale with tight letter spacing */
--text-xs: 0.75rem;    /* 12px - Small labels, captions */
--text-sm: 0.875rem;   /* 14px - Body text, forms */
--text-base: 1rem;     /* 16px - Default body text */
--text-lg: 1.125rem;   /* 18px - Emphasized text */
--text-xl: 1.25rem;    /* 20px - Small headings */
--text-2xl: 1.5rem;    /* 24px - Card headings */
--text-3xl: 2rem;      /* 32px - Section headings */
--text-4xl: 2.5rem;    /* 40px - Page headings */
--text-5xl: 3.25rem;   /* 52px - Hero headings */
--text-6xl: 3.75rem;   /* 60px - Large hero text */

/* Optimized line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* Refined letter spacing */
--tracking-tight: -0.017em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
```

### Typography Classes

```css
.h1 { @apply font-inter-tight text-5xl md:text-6xl font-bold tracking-tight; }
.h2 { @apply font-inter-tight text-4xl md:text-5xl font-bold tracking-tight; }
.h3 { @apply font-inter-tight text-3xl md:text-4xl font-bold tracking-tight; }
.h4 { @apply font-inter-tight text-2xl font-bold tracking-tight; }

.text-body { @apply font-inter text-base text-zinc-600 leading-relaxed; }
.text-lead { @apply font-inter text-lg text-zinc-600 leading-relaxed; }
.text-caption { @apply font-inter text-sm text-zinc-500; }
.text-label { @apply font-inter text-xs font-medium text-zinc-700 uppercase tracking-wide; }
```

## Spacing System

### Base Spacing Unit
```css
--spacing: 0.25rem; /* 4px base unit */
```

### Spacing Scale
```css
/* Consistent 4px-based spacing */
0    = 0px
1    = 4px    (--spacing * 1)
2    = 8px    (--spacing * 2)
3    = 12px   (--spacing * 3)
4    = 16px   (--spacing * 4)
5    = 20px   (--spacing * 5)
6    = 24px   (--spacing * 6)
8    = 32px   (--spacing * 8)
10   = 40px   (--spacing * 10)
12   = 48px   (--spacing * 12)
16   = 64px   (--spacing * 16)
20   = 80px   (--spacing * 20)
24   = 96px   (--spacing * 24)
32   = 128px  (--spacing * 32)
```

## Border Radius & Shadows

### Border Radius
```css
--radius-xs: 2px;      /* Checkbox, small elements */
--radius-sm: 4px;      /* Forms, small buttons */
--radius-md: 6px;      /* Cards, buttons */
--radius-lg: 8px;      /* Large cards, modals */
--radius-xl: 12px;     /* Hero sections, large components */
--radius-full: 9999px; /* Pills, avatar, circular elements */
```

### Shadow System
```css
/* Subtle, layered shadows */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
```

## Component Design Standards

### Buttons

#### Primary Button
```css
.btn-primary {
  @apply bg-zinc-800 hover:bg-zinc-900 text-white font-medium px-4 py-2.5 rounded-md;
  @apply transition-all duration-200 shadow-sm hover:shadow-md;
  @apply focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-2;
}
```

#### Secondary Button
```css
.btn-secondary {
  @apply bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium px-4 py-2.5 rounded-md;
  @apply transition-all duration-200 shadow-sm hover:shadow-md;
  @apply focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2;
}
```

#### Ghost Button
```css
.btn-ghost {
  @apply bg-transparent hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 font-medium px-4 py-2.5 rounded-md;
  @apply transition-all duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2;
}
```

### Form Elements

#### Input Fields
```css
.form-input {
  @apply bg-white border border-zinc-200 text-zinc-600 text-sm px-4 py-2.5 rounded-md;
  @apply focus:border-zinc-400 focus:ring-0 focus:ring-offset-0;
  @apply transition-colors duration-200 shadow-sm shadow-black/5;
  @apply placeholder-zinc-400;
}
```

#### Input States
```css
.form-input:focus { @apply border-zinc-400 shadow-md; }
.form-input:error { @apply border-rose-300 focus:border-rose-500; }
.form-input:disabled { @apply bg-zinc-50 text-zinc-400 cursor-not-allowed; }
```

### Cards

#### Base Card
```css
.card {
  @apply bg-white border border-zinc-200 rounded-lg shadow-sm;
  @apply p-6 transition-shadow duration-200;
}

.card:hover {
  @apply shadow-md;
}
```

#### Feature Card
```css
.card-feature {
  @apply bg-white border border-zinc-200 rounded-xl p-8 shadow-sm hover:shadow-md;
  @apply transition-all duration-300;
}
```

### Navigation

#### Header Navigation
```css
.nav-header {
  @apply bg-white border-b border-zinc-200 sticky top-0 z-50;
  @apply backdrop-blur-sm bg-white/95;
}

.nav-link {
  @apply text-zinc-600 hover:text-zinc-900 font-medium transition-colors duration-200;
  @apply px-3 py-2 rounded-md hover:bg-zinc-50;
}

.nav-link.active {
  @apply text-zinc-900 bg-zinc-100;
}
```

## Layout Guidelines

### Container System
```css
.container-sm { max-width: 640px; }    /* Small content */
.container-md { max-width: 768px; }    /* Forms, articles */
.container-lg { max-width: 1024px; }   /* Standard pages */
.container-xl { max-width: 1280px; }   /* Wide layouts */
.container-2xl { max-width: 1536px; }  /* Maximum width */
```

### Grid System
- Use CSS Grid for complex layouts
- Use Flexbox for component-level alignment
- Mobile-first responsive design
- Consistent gutters using spacing scale

### Breakpoints
```css
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

## Iconography

### Icon System
- **Primary:** Lucide Svelte (consistent, modern icons)
- **Size Scale:** 16px (sm), 20px (base), 24px (lg), 32px (xl)
- **Style:** Outlined, 1.5px stroke width
- **Colors:** Inherit text color for consistency

### Icon Usage Guidelines
```css
.icon-sm { @apply w-4 h-4; }     /* 16px - Inline with text */
.icon-base { @apply w-5 h-5; }   /* 20px - Standard size */
.icon-lg { @apply w-6 h-6; }     /* 24px - Emphasized actions */
.icon-xl { @apply w-8 h-8; }     /* 32px - Hero sections */
```

## Animation & Transitions

### Transition Standards
```css
/* Standard durations */
--duration-fast: 150ms;     /* Micro-interactions */
--duration-normal: 200ms;   /* Standard transitions */
--duration-slow: 300ms;     /* Complex animations */

/* Easing functions */
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Animation Principles
1. **Subtle and purposeful** - Enhance UX without being distracting
2. **Consistent timing** - Use standard durations
3. **Natural easing** - Prefer ease-out for most interactions
4. **Performance-first** - Use transform and opacity when possible

## Accessibility Standards

### Color Contrast
- **AA Compliance:** Minimum 4.5:1 for normal text
- **AAA Compliance:** 7:1 for important content
- **Large Text:** Minimum 3:1 ratio

### Focus States
```css
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2;
  @apply focus:ring-offset-white;
}
```

### Interactive States
- Clear hover states for all interactive elements
- Visible focus indicators for keyboard navigation
- Appropriate ARIA labels and roles
- Semantic HTML structure

## Component Naming Convention

### BEM Methodology
```css
/* Block */
.card { }

/* Element */
.card__header { }
.card__body { }
.card__footer { }

/* Modifier */
.card--featured { }
.card--compact { }

/* State */
.card.is-loading { }
.card.is-active { }
```

### Utility-First Approach
- Prefer Tailwind utilities for spacing, colors, and layout
- Create component classes for complex, reusable patterns
- Use CSS custom properties for themeable values

## Implementation Guidelines

### File Organization
```
src/
├── lib/
│   ├── components/
│   │   ├── ui/          # Base UI components
│   │   ├── layout/      # Layout components
│   │   └── features/    # Feature-specific components
│   ├── styles/
│   │   ├── globals.css  # Global styles and utilities
│   │   └── components/  # Component-specific styles
│   └── utils/
│       └── design.ts    # Design system utilities
```

### Code Standards
1. **Consistent naming** - Follow established conventions
2. **Reusable components** - Build with composition in mind
3. **Props validation** - TypeScript interfaces for all props
4. **Documentation** - Comment complex styling decisions

## Quality Checklist

### Design Review
- [ ] Follows color system guidelines
- [ ] Uses correct typography scale
- [ ] Implements proper spacing
- [ ] Includes all interactive states
- [ ] Meets accessibility standards
- [ ] Responsive across breakpoints
- [ ] Consistent with existing components

### Technical Review
- [ ] Uses semantic HTML
- [ ] Optimized for performance
- [ ] Follows naming conventions
- [ ] Includes proper TypeScript types
- [ ] Tested across browsers
- [ ] Mobile-friendly touch targets

## Usage Examples

### Hero Section
```svelte
<section class="bg-zinc-50 py-20 lg:py-32">
  <div class="container-lg mx-auto px-6">
    <div class="text-center space-y-6">
      <h1 class="h1 text-zinc-900">Transform Your Curiosity Into Knowledge</h1>
      <p class="text-lead max-w-3xl mx-auto">
        Explore any topic through AI-powered interactive mind maps
      </p>
      <button class="btn-primary">Start Learning</button>
    </div>
  </div>
</section>
```

### Feature Card
```svelte
<div class="card-feature">
  <div class="space-y-4">
    <div class="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center">
      <Icon class="icon-lg text-zinc-600" />
    </div>
    <h3 class="h4 text-zinc-900">Feature Title</h3>
    <p class="text-body">Feature description that explains the benefit clearly.</p>
  </div>
</div>
```

This design guide serves as the foundation for all UI development in Explore.fyi, ensuring consistency, accessibility, and professional quality across the entire application.
