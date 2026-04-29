# PrinceVChat Design Specification

## Overview
PrinceVChat is a Vercel.com-inspired group voice chat application with zero-config setup, no login/signup required.

## Design System

### Color Palette
- **Background Primary**: `#000000` (Black)
- **Background Secondary**: `#0a0a0a` (Near black)
- **Background Tertiary**: `#171717` (Dark gray)
- **Background Elevated**: `#262626` (Medium dark gray)
- **Text Primary**: `#ffffff` (White)
- **Text Secondary**: `#a3a3a3` (Gray 400)
- **Text Tertiary**: `#737373` (Gray 500)
- **Border Color**: `#262626` (Gray 800)
- **Border Subtle**: `#171717` (Gray 900)
- **Primary**: `#2294e9` (Blue)
- **Primary Hover**: `#1b7cc9` (Darker blue)
- **Success**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Amber)
- **Error**: `#ef4444` (Red)

### Typography
- **Font Family**: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Mono Font**: 'Geist Mono', 'Fira Code', monospace

### Spacing Scale
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px

### Border Radius
- `--radius-sm`: 4px
- `--radius-md`: 6px
- `--radius-lg`: 8px
- `--radius-xl`: 12px
- `--radius-full`: 9999px (pill)

---

## Page Designs

### 1. Landing Page

#### Structure
- Animated gradient background with grid overlay
- Navigation bar (logo only)
- Hero section with title, description, CTA buttons
- Features grid (3 columns on desktop)
- Code block section
- Footer

#### Hero Section
- Badge: "Zero-config voice chat"
- Title: "Group voice chat for every team" with gradient text
- Description: 2 lines max
- Buttons: "Create Room" (primary), "Join Room" (secondary)

#### Features Grid (3 columns)
1. **Instant** - Icon: clock, Description: Create room in seconds
2. **Private** - Icon: lock, Description: No tracking/recording
3. **Crystal Clear** - Icon: mic, Description: WebRTC audio

### 2. Username Modal

#### Structure
- Centered modal overlay with blur backdrop
- Modal box with form
- Form fields: Name input, (Room code for join)
- Action buttons: Cancel, Submit

### 3. Room Page (Glassmorphism Design)

#### Header
- Back button (left)
- User name (center)
- LIVE badge + participant count (right)
- Copy link button (far right)

#### Content
- **Invite Box**: Room link with copy button
- **Participants Section**:
  - Title + count badge
  - Flexbox grid of participant cards

#### Participant Card
- "You" badge (self) or "Host" badge (others)
- Hand raised icon (if raised)
- Avatar (initials in circle)
- Name
- Status (Speaking... / Connected / Hand raised)

#### Controls (Fixed Bottom)
- **Mute Button**: Mic icon + "Mute"/"Unmute" text
- **Raise Hand Button**: Hand icon + "Raise"/"Lower" text
- **Leave Button**: Exit icon + "Leave" text

---

## Responsive Breakpoints

### Desktop (> 1024px)
- Hero title: 80px
- Features: 3 columns
- Participants: 4+ columns flexbox

### Tablet (768px - 1024px)
- Hero title: 42px
- Features: 2 columns
- Participants: 2 columns

### Mobile (< 640px)
- Header: Compact, copy button shows icon only
- Hero: Single column, stacked buttons
- Features: Single column
- Participants: 2 columns flexbox, smaller cards
- Controls: Reduced padding, smaller buttons

### Small Mobile (< 400px)
- Participants: 2 columns with minimum card width
- Controls: Compact layout

---

## Component States

### Buttons
- **Primary**: White bg, black text, hover scales up
- **Secondary**: Transparent, white border, hover bg change
- **Ghost**: Transparent, hover shows subtle bg
- **Danger**: Red bg, hover darker red

### Control Buttons
- **Default**: Dark bg, white icon, gray text
- **Hover**: Lighter bg, primary icon color
- **Muted**: Red border, red icon, red text
- **Active (hand raised)**: Purple border, purple icon, purple text
- **Leave**: Red border, hover fills red

### Participant Cards
- **Default**: Dark bg, subtle border
- **Hover**: Slightly lighter bg, elevated transform
- **Speaking**: Green glow border, pulsing animation
- **Hand Raised**: Amber border, hand icon animated

---

## Animations

### Background
- Radial gradient animation (subtle)
- Grid pattern overlay

### Live Badge
- Pulse animation (opacity)

### Speaking
- Pulse animation on avatar border

### Hand Raised
- Wave animation on hand icon

### Toast Notifications
- Slide in from bottom
- Auto dismiss after 3s

---

## Technical Notes

### Glassmorphism Effects
- Use `backdrop-filter: blur()` on header and controls
- Semi-transparent backgrounds: `rgba(17, 17, 17, 0.8)`
- Subtle borders: `rgba(255, 255, 255, 0.08)`

### Flexbox Usage
- Header: `display: flex; align-items: center`
- Participants: `display: flex; flex-wrap: wrap`
- Controls: `display: flex; justify-content: center`

### Mobile Considerations
- Touch-friendly: min 48px tap targets
- Safe area insets for notched phones
- Landscape mode: compact horizontal layout