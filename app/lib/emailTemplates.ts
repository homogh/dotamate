import {
  emailAsset,
  emailButton,
  emailCallout,
  emailChips,
  emailDivider,
  emailFallbackLink,
  emailFeatureList,
  emailLayout,
  emailParagraph,
  emailStats,
  emailSteps,
  escapeHtml,
  type EmailStep,
} from "@/app/lib/emailLayout";

export interface EmailContent {
  subject: string;
  html: string;
  // Plain-text alternative — some clients show it, and spam filters like seeing one.
  text: string;
}

export function passwordResetEmail(resetUrl: string): EmailContent {
  const html = emailLayout({
    preheader: "برای انتخاب رمز جدید روی لینک داخل ایمیل بزن — تا ۱ ساعت معتبره.",
    hero: { src: emailAsset("password-reset.jpg"), alt: "بازیابی رمز دوتامیت" },
    eyebrow: "امنیت حساب",
    title: "بازیابی رمز عبور",
    content: [
      emailParagraph(
        "یه درخواست برای عوض کردن رمز حساب دوتامیتت به دستمون رسید. برای انتخاب رمز جدید روی دکمه‌ی زیر بزن.",
        { align: "center" },
      ),
      emailButton("تعیین رمز جدید", resetUrl),
      emailChips(["⏱ اعتبار: ۱ ساعت", "🔒 فقط یک‌بار قابل استفاده"]),
      emailCallout(
        "این درخواست رو تو ندادی؟",
        "نگران نباش؛ تا وقتی روی لینک نزنی رمزت عوض نمی‌شه. همین ایمیل رو نادیده بگیر. ما هیچ‌وقت رمزت رو از طریق ایمیل یا پیام ازت نمی‌پرسیم.",
        "warning",
      ),
      emailDivider(),
      emailFallbackLink(resetUrl),
    ].join(""),
    footerReason: "این ایمیل رو گرفتی چون برای حساب دوتامیتت درخواست بازیابی رمز ثبت شده.",
  });

  const text = [
    "بازیابی رمز عبور دوتامیت",
    "",
    "یه درخواست برای عوض کردن رمز حساب دوتامیتت به دستمون رسید. برای انتخاب رمز جدید این لینک رو باز کن:",
    resetUrl,
    "",
    "این لینک تا ۱ ساعت و فقط یک‌بار معتبره. اگه این درخواست رو تو ندادی، همین ایمیل رو نادیده بگیر؛ رمزت دست‌نخورده می‌مونه.",
  ].join("\n");

  return { subject: "بازیابی رمز عبور دوتامیت", html, text };
}

// Which onboarding page the user is stuck on — mirrors the redirect in app/dashboard/layout.tsx.
export type OnboardingStage = "steam" | "profile";

export interface SignupReminderInput {
  step: 1 | 2 | 3;
  displayName: string;
  stage: OnboardingStage;
  continueUrl: string;
  unsubscribeUrl: string;
  trackingPixelUrl?: string;
  // Social proof for the second email; omitted while the numbers are too small to impress.
  stats?: { players?: number; lobbiesThisWeek?: number };
}

function onboardingSteps(stage: OnboardingStage): EmailStep[] {
  return [
    { label: "ساخت حساب", state: "done" },
    { label: "اتصال استیم", state: stage === "steam" ? "current" : "done" },
    { label: "تکمیل پروفایل", state: stage === "profile" ? "current" : "todo" },
  ];
}

const MATCH_DATA_TIP = emailCallout(
  "تایید مچ‌هات گیر کرده؟",
  "توی خود بازی برو به <span dir=\"ltr\" style=\"unicode-bidi:embed;\">Settings → Options → General</span> و گزینه‌ی <b style=\"color:#f2f3f7;\">Expose Public Match Data</b> رو روشن کن. بعد یه بازی انجام بده و چند دقیقه بعد دوباره امتحان کن.",
);

const STAGE_NEXT: Record<OnboardingStage, { cta: string; text: string }> = {
  steam: {
    cta: "اتصال اکانت استیم",
    text: "قدم بعدی وصل کردن اکانت استیمه؛ کمتر از یه دقیقه طول می‌کشه و رنک و آمار بازی‌هات خودکار روی پروفایلت میاد.",
  },
  profile: {
    cta: "تکمیل پروفایل",
    text: "استیمت وصله و فقط مونده پروفایلت رو کامل کنی؛ نقش اصلی‌ت و چند تا اطلاعات کوتاه. بعدش آماده‌ی بازی‌ای.",
  },
};

export function signupReminderEmail(input: SignupReminderInput): EmailContent {
  const name = escapeHtml(input.displayName);
  const next = STAGE_NEXT[input.stage];
  const footerReason = "این ایمیل رو گرفتی چون با این آدرس توی دوتامیت ثبت‌نام کردی.";

  if (input.step === 1) {
    const html = emailLayout({
      preheader: "فقط چند دقیقه تا پیدا کردن هم‌تیمی‌های هم‌سطحت فاصله داری.",
      hero: { src: emailAsset("signup-reminder-1.jpg"), alt: "ثبت‌نام در دوتامیت" },
      eyebrow: input.stage === "steam" ? "دو قدم تا شروع بازی" : "فقط یه قدم مونده",
      title: `${name}، ثبت‌نامت نصفه موند!`,
      content: [
        emailParagraph(
          "توی دوتامیت ثبت‌نام کردی ولی کارش هنوز تموم نشده. تا مراحل رو کامل نکنی نمی‌تونی لابی بسازی، به تیم‌ها جوین بدی یا بقیه پیدات کنن.",
          { align: "center" },
        ),
        emailSteps(onboardingSteps(input.stage)),
        emailParagraph(next.text, { align: "center" }),
        emailButton(next.cta, input.continueUrl),
        input.stage === "steam" ? MATCH_DATA_TIP : "",
      ].join(""),
      footerReason,
      unsubscribeUrl: input.unsubscribeUrl,
      trackingPixelUrl: input.trackingPixelUrl,
    });

    return {
      subject: "ثبت‌نامت توی دوتامیت نصفه موند 👀",
      html,
      text: [`${input.displayName}، ثبت‌نامت توی دوتامیت نصفه موند!`, "", next.text, "", `ادامه‌ی ثبت‌نام: ${input.continueUrl}`, "", `لغو دریافت این ایمیل‌ها: ${input.unsubscribeUrl}`].join("\n"),
    };
  }

  if (input.step === 2) {
    const stats = [
      input.stats?.players ? { value: input.stats.players.toLocaleString("fa-IR"), label: "بازیکن فعال" } : null,
      input.stats?.lobbiesThisWeek ? { value: input.stats.lobbiesThisWeek.toLocaleString("fa-IR"), label: "لابی این هفته" } : null,
    ].filter((s): s is { value: string; label: string } => s !== null);

    const html = emailLayout({
      preheader: "ثبت‌نامت رو کامل کن و از امشب با تیم ثابت بازی کن.",
      hero: { src: emailAsset("signup-reminder-2.jpg"), alt: "تیم دوتامیت" },
      eyebrow: "تیمت منتظرته",
      title: "دیگه تنهایی کیو نزن",
      content: [
        emailParagraph(
          `${name}، از رندوم‌ها و بازی‌های بی‌هماهنگی خسته شدی؟ توی دوتامیت بازیکن‌های هم‌رنک خودت رو پیدا می‌کنی که با هم میک دارن و بازی رو جدی می‌گیرن.`,
          { align: "center" },
        ),
        stats.length > 0 ? emailStats(stats) : "",
        emailFeatureList([
          { icon: "🎯", title: "هم‌تیمی هم‌سطح", text: "بر اساس رنکی که با OpenDota تایید شده و پوزیشنی که بازی می‌کنی." },
          { icon: "💬", title: "لابی با چت اختصاصی", text: "لابی بساز یا جوین بده و قبل از بازی با تیمت هماهنگ کن." },
          { icon: "🛡️", title: "امتیاز رفتار", text: "بازیکن‌های تاکسیک گزارش می‌شن؛ با آدم‌های خوش‌رفتار بازی می‌کنی." },
        ]),
        emailSteps(onboardingSteps(input.stage)),
        emailButton(next.cta, input.continueUrl),
      ].join(""),
      footerReason,
      unsubscribeUrl: input.unsubscribeUrl,
      trackingPixelUrl: input.trackingPixelUrl,
    });

    return {
      subject: "هم‌تیمی‌های هم‌رنکت توی دوتامیت منتظرتن 🎮",
      html,
      text: [
        "دیگه تنهایی کیو نزن",
        "",
        "توی دوتامیت بازیکن‌های هم‌رنک خودت رو پیدا می‌کنی که با هم میک دارن و بازی رو جدی می‌گیرن.",
        next.text,
        "",
        `ادامه‌ی ثبت‌نام: ${input.continueUrl}`,
        "",
        `لغو دریافت این ایمیل‌ها: ${input.unsubscribeUrl}`,
      ].join("\n"),
    };
  }

  const html = emailLayout({
    preheader: "حسابت سر جاشه؛ از همون جایی که موندی ادامه بده.",
    hero: { src: emailAsset("signup-reminder-3.jpg"), alt: "دوتامیت" },
    eyebrow: "آخرین یادآوری",
    title: "جات توی تیم هنوز خالیه",
    content: [
      emailParagraph(
        `${name}، این آخرین ایمیلیه که درباره‌ی ثبت‌نامت می‌فرستیم. حسابت سر جاشه و هر وقت آماده بودی، از همون جایی که موندی ادامه می‌دی.`,
        { align: "center" },
      ),
      emailSteps(onboardingSteps(input.stage)),
      emailButton("ادامه‌ی ثبت‌نام", input.continueUrl),
      emailCallout(
        "جایی گیر کردی؟",
        input.stage === "steam"
          ? "اگه وصل کردن استیم یا تایید مچ‌ها درست پیش نمی‌ره (معمولاً به‌خاطر خاموش بودن گزینه‌ی <span dir=\"ltr\" style=\"unicode-bidi:embed;\">Expose Public Match Data</span> توی تنظیمات بازی)، از بخش پشتیبانی سایت بهمون پیام بده تا کمکت کنیم."
          : "اگه موقع تکمیل پروفایل به مشکلی خوردی، از بخش پشتیبانی سایت بهمون پیام بده تا کمکت کنیم.",
      ),
    ].join(""),
    footerReason,
    unsubscribeUrl: input.unsubscribeUrl,
    trackingPixelUrl: input.trackingPixelUrl,
  });

  return {
    subject: "آخرین یادآوری: ثبت‌نامت توی دوتامیت کامل نشده",
    html,
    text: [
      "جات توی تیم هنوز خالیه",
      "",
      "این آخرین ایمیلیه که درباره‌ی ثبت‌نامت می‌فرستیم. حسابت سر جاشه و هر وقت آماده بودی، از همون جایی که موندی ادامه می‌دی.",
      "",
      `ادامه‌ی ثبت‌نام: ${input.continueUrl}`,
      "",
      `لغو دریافت این ایمیل‌ها: ${input.unsubscribeUrl}`,
    ].join("\n"),
  };
}
