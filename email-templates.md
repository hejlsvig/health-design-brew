# Shifting Source — Supabase Email Templates

Gå til: https://supabase.com/dashboard/project/hllprmlkuchhfmexzpad/auth/templates

For hver template: klik på den, erstat Subject + Body (klik Source, Ctrl+A, slet, indsæt ny kode), tryk Save.

---

## 1. Confirm sign up
**Subject:** `Confirm your Shifting Source account`
**Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2d3a2e;font-family:'Helvetica Neue',Arial,sans-serif;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1a2a1c;border-radius:12px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:32px 40px 16px;border-bottom:1px solid rgba(140,160,140,0.15);">
            <span style="font-size:24px;font-weight:700;color:#e8dcc8;letter-spacing:1px;">SHIFTING SOURCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 12px;font-size:22px;color:#e8dcc8;font-weight:600;">Confirm your email</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#a0aa98;line-height:1.6;">
              Thanks for signing up! Click the button below to confirm your email address and activate your account.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 36px;background-color:#c2772a;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;">
                    Confirm email
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#707a6c;line-height:1.5;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 40px;border-top:1px solid rgba(140,160,140,0.15);">
            <p style="margin:0;font-size:12px;color:#5a6358;">&copy; Shifting Source &mdash; shiftingsource.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 2. Invite user
**Subject:** `You've been invited to Shifting Source`
**Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2d3a2e;font-family:'Helvetica Neue',Arial,sans-serif;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1a2a1c;border-radius:12px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:32px 40px 16px;border-bottom:1px solid rgba(140,160,140,0.15);">
            <span style="font-size:24px;font-weight:700;color:#e8dcc8;letter-spacing:1px;">SHIFTING SOURCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 12px;font-size:22px;color:#e8dcc8;font-weight:600;">You've been invited</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#a0aa98;line-height:1.6;">
              You've been invited to join Shifting Source. Click the button below to accept the invitation and set up your account.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 36px;background-color:#c2772a;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;">
                    Accept invitation
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#707a6c;line-height:1.5;">
              If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 40px;border-top:1px solid rgba(140,160,140,0.15);">
            <p style="margin:0;font-size:12px;color:#5a6358;">&copy; Shifting Source &mdash; shiftingsource.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 3. Magic link (ALLEREDE OPDATERET ✅)
**Subject:** `Sign in to Shifting Source`

---

## 4. Reset password
**Subject:** `Reset your Shifting Source password`
**Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2d3a2e;font-family:'Helvetica Neue',Arial,sans-serif;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1a2a1c;border-radius:12px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:32px 40px 16px;border-bottom:1px solid rgba(140,160,140,0.15);">
            <span style="font-size:24px;font-weight:700;color:#e8dcc8;letter-spacing:1px;">SHIFTING SOURCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 12px;font-size:22px;color:#e8dcc8;font-weight:600;">Reset your password</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#a0aa98;line-height:1.6;">
              We received a request to reset your password. Click the button below to choose a new one.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 36px;background-color:#c2772a;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;">
                    Reset password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#707a6c;line-height:1.5;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 40px;border-top:1px solid rgba(140,160,140,0.15);">
            <p style="margin:0;font-size:12px;color:#5a6358;">&copy; Shifting Source &mdash; shiftingsource.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 5. Change email address
**Subject:** `Confirm your new email address`
**Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2d3a2e;font-family:'Helvetica Neue',Arial,sans-serif;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1a2a1c;border-radius:12px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:32px 40px 16px;border-bottom:1px solid rgba(140,160,140,0.15);">
            <span style="font-size:24px;font-weight:700;color:#e8dcc8;letter-spacing:1px;">SHIFTING SOURCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 12px;font-size:22px;color:#e8dcc8;font-weight:600;">Confirm email change</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#a0aa98;line-height:1.6;">
              Click the button below to confirm the change to your email address.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 36px;background-color:#c2772a;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;">
                    Confirm new email
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#707a6c;line-height:1.5;">
              If you didn't request this change, please secure your account immediately.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 40px;border-top:1px solid rgba(140,160,140,0.15);">
            <p style="margin:0;font-size:12px;color:#5a6358;">&copy; Shifting Source &mdash; shiftingsource.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 6. Reauthentication
**Subject:** `Shifting Source security code`
**Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2d3a2e;font-family:'Helvetica Neue',Arial,sans-serif;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1a2a1c;border-radius:12px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:32px 40px 16px;border-bottom:1px solid rgba(140,160,140,0.15);">
            <span style="font-size:24px;font-weight:700;color:#e8dcc8;letter-spacing:1px;">SHIFTING SOURCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 12px;font-size:22px;color:#e8dcc8;font-weight:600;">Security verification</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#a0aa98;line-height:1.6;">
              Enter the following code to confirm your identity:
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <span style="display:inline-block;padding:16px 32px;background-color:#2d3a2e;color:#e8dcc8;font-size:28px;font-weight:700;letter-spacing:6px;border-radius:8px;border:1px solid rgba(140,160,140,0.2);">
                    {{ .Token }}
                  </span>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#707a6c;line-height:1.5;">
              If you didn't request this code, please secure your account immediately.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 40px;border-top:1px solid rgba(140,160,140,0.15);">
            <p style="margin:0;font-size:12px;color:#5a6358;">&copy; Shifting Source &mdash; shiftingsource.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```
