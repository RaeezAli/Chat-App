# 🚀 Ultra-Premium Real-Time Chat & Calling App

A state-of-the-art, high-performance group chat application with **Persistent Voice Calling**, built with a focus on speed, premium aesthetics, and seamless user experience.

![Premium UI Showcase](https://raw.githubusercontent.com/RaeezAli/Chat-App/main/public/preview-placeholder.png)

## ✨ Advanced Features

### 📞 Persistent Voice Calling (WebRTC)

- **Background Persistence**: Calls stay active even when switching between different chat groups or navigating the app.
- **Draggable Call Modal**: A fully moveable minimized widget (bubble on mobile, window on desktop) that supports both mouse and touch dragging.
- **Real-time Signaling**: Optimized WebRTC signaling via Firebase for instant connectivity.
- **Privacy First**: Explicit microphone access only; video functionality has been removed for a clean voice-only experience.

### 🎨 Premium UI/UX

- **OLED Dark Mode**: A stunning deep-black theme (`gray-950`) optimized for OLED screens with high-contrast elements.
- **Glassmorphism**: Elegant blur effects and translucent overlays for a modern, airy feel.
- **Smooth Animations**: Powered by Framer Motion for liquid-smooth transitions, slide-ins, and micro-interactions.
- **Skeleton Loading**: High-fidelity placeholder states for a perceived performance boost.

### 💬 Rich Messaging Experience

- **Reactions & Replies**: Long-press or swipe messages to react with emojis or start a threaded reply.
- **Real-Time Sync**: Instant message delivery and reaction updates using optimized Firebase listeners.
- **Media Integration**: Upload images, videos, and files directly via Cloudinary integration with live previews.
- **Typing Indicators**: See who's active in the chat in real-time.

### 📱 Mobile-First Design

- **Swipe Actions**: Swipe right on any message to reply; swipe left on the header to see group info.
- **Optimized Keyboard Handling**: Message input and UI layouts adjust seamlessly to mobile keyboards.
- **Touch Dragging**: Move the call bubble with intuitive finger gestures.

## 🛠️ Technical Stack

- **Frontend**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Backend**: [Firebase Firestore](https://firebase.google.com/products/firestore) & [Anonymous Auth](https://firebase.google.com/products/auth)
- **Real-Time Audio**: [WebRTC](https://webrtc.org/) (Multi-Peer Mesh)
- **Media Storage**: [Cloudinary](https://cloudinary.com/)
- **Icons**: [Heroicons](https://heroicons.com/) & [Emoji Mart](https://github.com/missive/emoji-mart)
