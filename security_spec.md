# Security Specification: Guestbook Kiosk

This of security specifications governs the data access rules for the library guestbook kiosk.

## 1. Data Invariants

- **Visitor Records (`/visitors/{visitorId}`)**:
  - Anyone (even unauthenticated guest users on the library tablet) can CREATE a visitor record.
  - No one can UPDATE a visitor record once it is submitted to maintain the integrity of guest feedback and registration timestamps (Immutable). Exception: Super admins can modify / correct records.
  - Only authenticated admins and staff users can READ, LIST, or DELETE visitor records.
  - All submitted string values (names, purpose, suggestions) must be strictly bounded in length to prevent "Denial of Wallet" size attacks.
  - Fields `id`, `visit_number`, `visitor_count`, and `visit_date` are strictly required on creation.

- **Global Config & Synthesizer Settings (`/system_settings/{settingsId}`)**:
  - Anyone (unauthenticated) can READ settings (for library logo, name, and speak controls).
  - Only authenticated admins can CREATE, UPDATE, or DELETE settings.
  - The document path is restricted strictly to `/system_settings/default` (representing the single active kiosk client configuration).

---

## 2. The "Dirty Dozen" Malicious Payloads (Vulnerability Scenarios)

Below are the 12 specific exploit structures designed to violate guestbook integrity, all of which MUST return `PERMISSION_DENIED`.

1. **Unauthenticated Settings Manipulation**:
   - An unauthenticated user attempts to update `/system_settings/default` to deface the library name or disable the TTS welcome.
2. **Visitor Read Exposure**:
   - An unauthenticated user tries to `get` or `list` `/visitors/{visitorId}` to scrape visitors' personal emails, phone numbers, signatures, or photos.
3. **Malicious Signature Injection (Denial of Wallet)**:
   - A visitor attempts to upload a 5MB payload in `signature` or `name` field to inflate Firestore database storage.
4. **Id Spoofing / Poisoning**:
   - Creating a visitor document with an invalid ID like `../path/bypass` or an extremely long string (> 128 chars) containing high-byte unicode sequences.
5. **No-Name Registration Bypass**:
   - Attempting to submit a Visitor record without a `name` or `visit_number`.
6. **Visitor Record Tampering (Shadow Updates)**:
   - An unauthenticated client attempts to change a visitor's `impression` or `suggestion` hours after submission.
7. **Visitor Self-Deletion (Log Erasure)**:
   - A visitor attempts to `delete` their registration log to hide the count, names, or timing of their visit.
8. **Settings Key Pollution (Orphan Keys)**:
   - Updating `/system_settings/default` with unapproved keys (e.g. adding `isHacked: true`) through shadow maps.
9. **Settings ID Hijacking**:
   - Creating a second settings document at `/system_settings/unapproved_node` to bypass global library headers.
10. **Admin Privilege Escalation**:
    - Setting custom claims or modifying `role` manually on a restricted user profile.
11. **Negative Count Injection**:
    - Registering a visit group count of `-5` or empty value to break metric aggregations.
12. **Future Timestamp Spoofing (Temporal Integrity)**:
    - Injecting a fake `created_at` timestamp with a year like `2090-01-01` instead of using the server's authoritative `request.time`.

---

## 3. The Test Runner Specification (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules TDD', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'phonic-drake-t4wsx',
      firestore: {
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // Pillar 1: Settings Access Control
  it('should deny unauthenticated users from modifying global library settings', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const settingsRef = doc(unauthDb, 'system_settings', 'default');
    await assertFails(setDoc(settingsRef, {
      tts_enabled: false,
      library_name: 'Hacked Lib'
    }));
  });

  it('should allow readers to read settings without authentication', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const settingsRef = doc(unauthDb, 'system_settings', 'default');
    // Admin context prepares default data
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'system_settings', 'default'), {
        tts_enabled: true,
        tts_volume: 0.8,
        tts_rate: 1.0,
        library_name: 'Test Lib'
      });
    });
    await assertSucceeds(getDoc(settingsRef));
  });

  // Pillar 2: Visitor Log Safety
  it('should allow anyone to create a visitor log', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const visitorRef = doc(unauthDb, 'visitors', 'v-1234');
    await assertSucceeds(setDoc(visitorRef, {
      id: 'v-1234',
      visit_number: 'V-20260608-001',
      name: 'Budi Santoso',
      institution: 'Universitas Indonesia',
      visit_date: '2026-06-08',
      visitor_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  });

  it('should fail if visitors schema misses required parameters', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const visitorRef = doc(unauthDb, 'visitors', 'v-invalid');
    await assertFails(setDoc(visitorRef, {
      id: 'v-invalid',
      // Missing name and visit_number
      institution: 'Unknown'
    }));
  });

  it('should deny unauthenticated users from viewing or reading visitor logs', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const visitorRef = doc(unauthDb, 'visitors', 'v-1234');
    await assertFails(getDoc(visitorRef));
  });

  it('should allow admin authenticated users to read records', async () => {
    const adminDb = testEnv.authenticatedContext('admin_uid', { email: 'admin@labschooldb.com', email_verified: true }).firestore();
    const visitorRef = doc(adminDb, 'visitors', 'v-1234');
    await assertSucceeds(getDoc(visitorRef));
  });
});
```
