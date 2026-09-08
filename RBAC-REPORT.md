# گزارش تحلیل سیستم RBAC - Uptime Kuma

**تاریخ:** 2026-09-08  
**تعداد تست‌ها:** 20/20 pass

---

## Invariant های شناسایی شده

| # | Invariant | Location |
|---|-----------|----------|
| 1 | کاربر اولیه همیشه admin است | `server/server.js:714` |
| 2 | نقش پیش‌فرض کاربر جدید viewer است | `server/server.js:1732` |
| 3 | اگر کاربر لاگین نباشد خطا پرتاب می‌شود | `server/rbac.js:14` |
| 4 | اگر نقش کاربر در لیست مجاز نباشد خطا پرتاب می‌شود | `server/rbac.js:19-21` |
| 5 | اگر userRole تعریف نشده باشد، viewer در نظر گرفته می‌شود | `server/rbac.js:17` |
| 6 | کاربر نمی‌تواند خودش را حذف کند | `server/server.js:1748-1749` |

---

## جدول دسترسی (Access Matrix)

| Operation | Admin | Editor | Viewer |
|-----------|-------|--------|--------|
| add monitor | ✓ | ✓ | ✗ |
| edit monitor | ✓ | ✓ | ✗ |
| delete monitor | ✓ | ✓ | ✗ |
| pause monitor | ✓ | ✓ | ✗ |
| add notification | ✓ | ✓ | ✗ |
| edit notification | ✓ | ✓ | ✗ |
| delete notification | ✓ | ✓ | ✗ |
| get monitors list | ✓ | ✓ | ✓ |
| get heartbeat | ✓ | ✓ | ✓ |
| get user list | ✓ | ✗ | ✗ |
| add user | ✓ | ✗ | ✗ |
| delete user | ✓ | ✗ | ✗ |
| change password (self) | ✓ | ✓ | ✓ |
| init server timezone | ✓ | ✗ | ✗ |
| get PM2 process list | ✓ | ✗ | ✗ |
| test Chrome | ✓ | ✗ | ✗ |

---

## ⚠️ مشکلات امنیتی شناسایی شده

### مشکل ۱: نبود RBAC Guard در چندین Socket Handler

این handlerها فقط `checkLogin` دارند و `checkRole` ندارند، یعنی **هر کاربر لاگین‌شده‌ای** (حتی viewer) می‌تواند عملیات نوشتاری انجام دهد:

| Handler | عملیات بدون محافظت |
|---------|---------------------|
| `proxy-socket-handler.js` | اضافه/ویرایش/حذف پروکسی |
| `docker-socket-handler.js` | اضافه/ویرایش/حذف Docker Host |
| `remote-browser-socket-handler.js` | اضافه/ویرایش/حذف Remote Browser |
| `api-key-socket-handler.js` | اضافه/ویرایش/حذف API Key |
| `cloudflared-socket-handler.js` | مدیریت Cloudflared |
| `database-socket-handler.js` | بکاپ/ریستور دیتابیس |
| `status-page-socket-handler.js` | اضافه/ویرایش/حذف Status Page |
| `maintenance-socket-handler.js` | اضافه/ویرایش/حذف Maintenance |

### مشکل ۲: اعتبارسنجی نقش در addUser وجود ندارد

```js
// server/server.js:1732
user.role = data.role || "viewer";
```

اگر کاربر مقداری مثل `"hacker"` بفرستد، بدون اعتبارسنجی ذخیره می‌شود.

### مشکل ۳: نبود Mechanism جلوگیری از Privilege Escalation

کاربر viewer می‌تواند از طریق مستقیم socket نقش خود را تغییر دهد (اگر endpoint مربوطه وجود داشته باشد).

---

## نتیجه‌گیری

سیستم RBAC پایه‌ای کار می‌کند ولی **تکمیل نیست**. بیشتر socket handlerها محافظت نشده‌اند و اعتبارسنجی نقش هنگام ایجاد کاربر وجود ندارد.

---

## فایل تست

فایل تست در `test/rbac-invariants.test.js` قرار دارد. برای اجرا:

```bash
node test/rbac-invariants.test.js
```
