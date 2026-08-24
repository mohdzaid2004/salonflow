# 🍎 SalonFlow — Apple App Store Release & iOS Bundle Specifications

## 1. Application Identity
- **App Name**: SalonFlow
- **Bundle ID**: `com.salonflow.app`
- **Primary Category**: Business
- **Secondary Category**: Productivity
- **Target Devices**: iPhone (iOS 15.0+), iPad (iPadOS 15.0+), Mac with Apple Silicon (macOS 12.0+)
- **Primary Accent Color**: `#7C3AED` (Royal Purple)
- **Background Color**: `#000000` (Pitch Black)

---

## 2. App Store Listing Copy

### Subtitle (Max 30 characters):
> Smart Salon POS & Appointments

### Promotional Text (Max 170 characters):
> Streamline your salon operations with real-time appointment booking, lightning-fast walk-in POS billing, client CRM, staff tracking, and instant WhatsApp PDF receipts.

### Description:
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
> Works synchronously across your salon reception desktop, manager laptop, and staff iPhones / iPads powered by Cloud Firestore real-time replication.

### Keywords (Max 100 characters):
> salon,spa,barber,pos,billing,appointment,booking,stylist,haircut,crm,invoicing,whatsapp,schedule

---

## 3. App Store Asset Checklist
- [x] **App Icon**: 1024 × 1024 px PNG (no alpha / no transparency)
- [x] **iPhone Screenshots**: 6.7" Display (1290 × 2796 px) & 6.5" Display (1242 × 2688 px)
- [x] **iPad Screenshots**: 12.9" Display (2048 × 2732 px)
- [x] **Support URL**: `https://salonflow--salonindia-74cbb.us-east4.hosted.app`
- [x] **Marketing URL**: `https://salonflow--salonindia-74cbb.us-east4.hosted.app`
- [x] **Privacy Policy URL**: `https://salonflow--salonindia-74cbb.us-east4.hosted.app`

---

## 4. iOS Build Instructions via Capacitor

```bash
# 1. Install Capacitor iOS package
npm i @capacitor/ios

# 2. Add iOS Native Project
npx cap add ios

# 3. Synchronize Web Assets & Plugins
npx cap sync ios

# 4. Open in Xcode
npx cap open ios

# 5. In Xcode: Select Development Team, configure App Store Provisioning Profile, and Archive for TestFlight / App Store
```
