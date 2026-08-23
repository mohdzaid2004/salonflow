# 🚀 SalonFlow — Google Play Store Release & App Package Specifications

## 1. Application Identity
- **Application Name**: SalonFlow
- **Package Name (Application ID)**: `com.salonflow.app`
- **Category**: Business / Productivity / Salon Management
- **Target OS**: Android 8.0 (API 26) to Android 15 (API 35+)
- **Primary Color**: `#7C3AED` (Royal Purple)
- **Background Color**: `#000000` (Pitch Black)

---

## 2. Store Listing Copy

### Short Description (Max 80 chars):
> Complete salon management: appointments, fast billing POS, staff & WhatsApp receipts.

### Full Description:
> **SalonFlow** is the modern, all-in-one salon management operating system built specifically for salon owners, front-desk receptionists, managers, and stylists.
>
> 🚀 **KEY FEATURES:**
> - 📅 **Real-Time Appointment Scheduling:** Manage daily chair allocations, stylist calendars, and client time slots seamlessly.
> - 🚪 **Client Check-In & POS:** Super-fast walk-in registration, customer queue, and itemized billing in seconds.
> - 💳 **Smart Billing & Receipts:** Support for UPI, Cards, and Cash with instant digital invoice generation and zero manual calculations.
> - 📱 **Automated WhatsApp Notifications:** Deliver professional digital PDF receipts, booking reminders, and feedback links straight to your client's WhatsApp.
> - 👥 **Customer CRM & Loyalty Points:** Track visit histories, spending trends, birthdays, and automatic reward point redemptions.
> - ✂️ **Staff & Service Management:** Organize services, pricing, durations, stylist schedules, and commissions in one unified interface.
> - 📊 **Real-Time Analytics & Reports:** Live revenue metrics, service profitability distributions, and daily transaction history synchronized across all your devices.
>
> ⚡ **MULTI-DEVICE SYNC:**  
> Works synchronously across your salon reception desktop, manager laptop, and staff mobile phones powered by Cloud Firestore real-time replication.

---

## 3. Play Store Assets Checklist
- [x] **App Icon**: 512 × 512 px PNG (32-bit with alpha) (`/public/icon.svg`)
- [x] **Feature Graphic**: 1024 × 500 px JPEG/PNG
- [x] **Screenshots**: Minimum 2 phone screenshots (1080 × 1920 px or 1080 × 2400 px), 7-inch tablet, and 10-inch tablet.
- [x] **Privacy Policy URL**: `https://salonflow--salonindia-74cbb.us-east4.hosted.app`
- [x] **Data Safety**:
  - Encrypted in transit (HTTPS / TLS 1.3)
  - User authentication via Firebase Auth
  - No personal data shared with third-party advertisers.

---

## 4. Android Build Instructions via Capacitor

```bash
# 1. Install Capacitor CLI & Android package (if building local APK/AAB)
npm i @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Android Project
npx cap add android

# 3. Synchronize Web Assets & Config
npx cap sync android

# 4. Open in Android Studio to build signed Release AAB
npx cap open android
```
