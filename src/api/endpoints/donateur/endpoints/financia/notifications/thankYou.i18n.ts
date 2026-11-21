import { getSupportContact } from "../../../../../../utils/emailSupport";

/** Langues des sites Lap Nomba. Toute autre valeur retombe sur le français. */
export const DONOR_LANGUAGES = ["fr", "en", "ar", "tr"] as const;
export type DonorLanguage = (typeof DONOR_LANGUAGES)[number];

export const normalizeDonorLanguage = (value?: string | null): DonorLanguage => {
  const code = String(value || "").trim().toLowerCase().slice(0, 2);
  return (DONOR_LANGUAGES as readonly string[]).includes(code) ? (code as DonorLanguage) : "fr";
};

type ThankYouCopy = {
  subject: string;
  title: string;
  hello: (name: string) => string;
  defaultName: string;
  /** Phrase de remerciement ; {amount} est remplacé par le montant (en gras dans le HTML). */
  thanks: string;
  mission: string;
  confirmed: string;
  closing: string;
  helpTitle: string;
  help: (email: string, whatsapp: string) => string;
  tagline: string;
  intl: string;
};

const COPY: Record<DonorLanguage, ThankYouCopy> = {
  fr: {
    subject: "Merci pour votre soutien à Lap Nomba Foundation",
    title: "Merci pour votre soutien",
    hello: (n) => `Bonjour ${n},`,
    defaultName: "cher donateur",
    thanks: "Nous vous remercions sincèrement pour votre contribution de {amount} à Lap Nomba Foundation.",
    mission:
      "Votre geste contribue directement à notre mission de sensibilisation, de formation et d’intégration des jeunes vers des opportunités numériques éthiques et durables.",
    confirmed: "Votre paiement a bien été confirmé. Un reçu vous sera également transmis.",
    closing: "Avec toute notre gratitude,",
    helpTitle: "Besoin d'aide ?",
    help: (e, w) =>
      `Ce message a été généré automatiquement. Pour toute question, contactez notre équipe support à ${e} ou via WhatsApp au ${w}.`,
    tagline: "Sensibiliser. Former. Intégrer.",
    intl: "fr-FR",
  },
  en: {
    subject: "Thank you for supporting Lap Nomba Foundation",
    title: "Thank you for your support",
    hello: (n) => `Hello ${n},`,
    defaultName: "dear donor",
    thanks: "We sincerely thank you for your contribution of {amount} to Lap Nomba Foundation.",
    mission:
      "Your gift directly supports our mission to raise awareness, train young people and guide them towards ethical and lasting digital opportunities.",
    confirmed: "Your payment has been confirmed. A receipt will also be sent to you.",
    closing: "With all our gratitude,",
    helpTitle: "Need help?",
    help: (e, w) =>
      `This message was sent automatically. For any question, contact our support team at ${e} or on WhatsApp at ${w}.`,
    tagline: "Raise awareness. Train. Integrate.",
    intl: "en-GB",
  },
  ar: {
    subject: "شكرًا لدعمكم مؤسسة لاب نومبا",
    title: "شكرًا لدعمكم",
    hello: (n) => `مرحبًا ${n}،`,
    defaultName: "عزيزنا المتبرع",
    thanks: "نشكركم بصدق على مساهمتكم بمبلغ {amount} لصالح مؤسسة لاب نومبا (Lap Nomba Foundation).",
    mission:
      "تبرعكم يدعم مباشرةً مهمتنا في التوعية وتدريب الشباب ومرافقتهم نحو فرص رقمية أخلاقية ومستدامة.",
    confirmed: "تم تأكيد دفعتكم بنجاح، وسيصلكم إيصال أيضًا.",
    closing: "مع خالص امتناننا،",
    helpTitle: "هل تحتاجون إلى مساعدة؟",
    help: (e, w) =>
      `هذه رسالة آلية. لأي سؤال، تواصلوا مع فريق الدعم عبر ${e} أو عبر واتساب على الرقم ${w}.`,
    tagline: "توعية. تدريب. إدماج.",
    intl: "ar",
  },
  tr: {
    subject: "Lap Nomba Foundation'a desteğiniz için teşekkür ederiz",
    title: "Desteğiniz için teşekkürler",
    hello: (n) => `Merhaba ${n},`,
    defaultName: "değerli bağışçımız",
    thanks: "Lap Nomba Foundation'a yaptığınız {amount} tutarındaki katkı için içtenlikle teşekkür ederiz.",
    mission:
      "Bağışınız; gençleri bilinçlendirme, eğitme ve etik ve kalıcı dijital fırsatlara yönlendirme misyonumuza doğrudan katkı sağlıyor.",
    confirmed: "Ödemeniz onaylandı. Ayrıca size bir makbuz gönderilecektir.",
    closing: "En içten şükranlarımızla,",
    helpTitle: "Yardıma mı ihtiyacınız var?",
    help: (e, w) =>
      `Bu mesaj otomatik olarak gönderilmiştir. Her türlü sorunuz için destek ekibimize ${e} adresinden veya WhatsApp üzerinden ${w} numarasından ulaşabilirsiniz.`,
    tagline: "Bilinçlendir. Eğit. Entegre et.",
    intl: "tr-TR",
  },
};

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const formatAmount = (amount: unknown, currency: unknown, intl: string) => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? new Intl.NumberFormat(intl, { maximumFractionDigits: 2 }).format(n) : String(amount ?? "");
  return `${value} ${String(currency || "XAF")}`;
};

/** E-mail de remerciement du donateur dans sa langue (sujet, texte et HTML ; arabe en RTL). */
export const buildThankYouEmail = (donation: any) => {
  const lang = normalizeDonorLanguage(donation?.language);
  const c = COPY[lang];
  const name = String(donation?.donorName || "").trim() || c.defaultName;
  const amount = formatAmount(donation?.amount, donation?.currency, c.intl);
  const { email, whatsappDisplay, whatsappLink } = getSupportContact();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "right" : "left";

  const thanksHtml = escapeHtml(c.thanks).replace(
    "{amount}",
    `<strong><span dir="ltr">${escapeHtml(amount)}</span></strong>`
  );
  const helpHtml = escapeHtml(c.help("\u0000E", "\u0000W"))
    .replace("\u0000E", `<a href="mailto:${email}" style="color:#2563EB;text-decoration:none">${email}</a>`)
    .replace("\u0000W", `<a href="${whatsappLink}" style="color:#2563EB;text-decoration:none" dir="ltr">${whatsappDisplay}</a>`);

  const html = `<div dir="${dir}" lang="${lang}" style="text-align:${align};font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111827">
  <h2 style="margin:0 0 16px">${escapeHtml(c.title)}</h2>
  <p>${escapeHtml(c.hello(name))}</p>
  <p>${thanksHtml}</p>
  <p>${escapeHtml(c.mission)}</p>
  <p>${escapeHtml(c.confirmed)}</p>
  <p>${escapeHtml(c.closing)}<br /><strong>Lap Nomba Foundation</strong></p>
  <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 16px" />
  <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 8px"><strong style="color:#374151">${escapeHtml(c.helpTitle)}</strong><br />${helpHtml}</p>
  <p style="font-size:12px;color:#9CA3AF;margin:12px 0 0">Lap Nomba Foundation — ${escapeHtml(c.tagline)}</p>
</div>`;

  const text = [
    c.title,
    "",
    c.hello(name),
    "",
    c.thanks.replace("{amount}", amount),
    "",
    c.mission,
    "",
    c.confirmed,
    "",
    c.closing,
    "Lap Nomba Foundation",
    "",
    "---",
    c.help(email, whatsappDisplay),
    "",
    `Lap Nomba Foundation — ${c.tagline}`,
  ].join("\n");

  return { subject: c.subject, html, text, language: lang };
};
