# 🚀 High-Performance Group Chat App

This project is a state-of-the-art, real-time group chat application built from scratch in **under 1 hour** as a demonstration of the power and intelligence of **Antigravity**.

## 🌟 Built by Antigravity

This entire codebase—including the architecture, the responsive UI, the real-time synchronization, and the multi-media integration—was designed and implemented by **Antigravity**. It serves as a testing ground to showcase how a complex, production-ready application can be scaffolded and refined in record time.

## ✨ Key Features

- **Real-Time Messaging**: Instant sync across devices using Firestore `onSnapshot`.
- **Group Management**:
  - Create and join groups via unique invite codes.
  - Role-based permissions (Admin vs. Member).
  - Admin controls for group deletion and message purging.
- **Rich Media Integration**:
  - Direct uploads of images, videos, and documents via **Cloudinary**.
  - Live media previews in chat bubbles.
- **Premium User Experience**:
  - **Responsive Design**: Mobile-first UI with smooth slide transitions.
  - **Deferred Onboarding**: Explore the app before being prompted for a username.
  - **Emoji Support**: Integrated `emoji-mart` for expressive communication.
- **Data Integrity**:
  - Duplicate member prevention.
  - Persistent message history and optimistic UI updates.

## 🛠️ Tech Stack

- **Frontend**: React 18 (Vite + SWC)
- **Styling**: Tailwind CSS (Mobile-responsive, Dark Mode)
- **Backend/Database**: Firebase (Firestore, Anonymous Auth)
- **Media Storage**: Cloudinary (Unsigned uploads)
- **Icons/Components**: Emoji Mart, Heroicons

## 🚀 Getting Started

### 1. Prerequisites

- Node.js installed.
- A Firebase project.
- A Cloudinary account.

### 2. Configuration

Create a `.env` file in the root directory:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

Update your Firebase configuration in `src/firebase/config.js`.

### 3. Firestore Rules

Deploy these rules to allow anonymous group management:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /groups/{groupId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && resource.data.createdBy == request.auth.uid;
    }
    match /messages/{messageId} {
      allow read, create, delete: if request.auth != null;
    }
  }
}
```

### 4. Installation & Running

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## 📜 License

This project was created for demonstration and testing purposes.
