import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { DonationModel } from "../models/donor";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateReceiptNumber(donation: any): string {
  const year = new Date().getFullYear();
  const shortId = String(donation._id).slice(-6).toUpperCase();
  return `RECU-${year}-${shortId}`;
}

function getPaymentMethodLabel(method?: string): string {
  switch (method) {
    case "MOMO":
      return "MTN Mobile Money";
    case "ORANGE_MONEY":
      return "Orange Money";
    case "CARD":
      return "Carte bancaire";
    case "BANK_TRANSFER":
      return "Virement bancaire";
    case "CRYPTO":
      return "Crypto-monnaie";
    case "CASH":
      return "Espèces";
    default:
      return "Paiement électronique";
  }
}

function getDonationReference(donation: any): string {
  return (
    donation.providerReference ||
    donation.providerTransactionId ||
    donation.bankTransfer?.reference ||
    donation.receiptNumber ||
    "N/A"
  );
}

export async function generateAndSendReceipt(donation: any): Promise<boolean> {
  const receiptNumber = generateReceiptNumber(donation);
  const fileName = `${receiptNumber}.pdf`;

  const rootPath = process.cwd();
  const pdfPath = path.join(rootPath, "public", "receipts", fileName);

  const logoPath = path.join(rootPath, "src", "assets", "logo.png");
  const cachetPath = path.join(rootPath, "src", "assets", "cachet.png");

  if (!fs.existsSync(path.dirname(pdfPath))) {
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  }

  const paymentMethodLabel = getPaymentMethodLabel(donation.paymentMethod);
  const reference = getDonationReference(donation);
  const formattedAmount = new Intl.NumberFormat("fr-FR").format(
    donation.amount || 0
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const writeStream = fs.createWriteStream(pdfPath);

    doc.pipe(writeStream);

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 60 });
    }

    doc.fillColor("#1a237e").fontSize(20).text("FONDATION LAP NOMBA", 120, 50);
    doc
      .fillColor("#444")
      .fontSize(10)
      .font("Helvetica-Oblique")
      .text("« Former pour transformer »", 120, 75);

    doc
      .font("Helvetica")
      .fillColor("#000")
      .fontSize(9)
      .text("Quartier Essomba – Yaoundé, Cameroun", 120, 95)
      .text("Email: contact@lapnomba.org | Site: www.lapnomba.org", 120, 110);

    doc.rect(50, 140, 500, 2).fill("#1a237e");

    doc.moveDown(4);
    doc
      .font("Helvetica-Bold")
      .fillColor("#000")
      .fontSize(16)
      .text("REÇU OFFICIEL DE DON", { align: "center", underline: true });

    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`N° ${receiptNumber}`, { align: "center" });

    doc.moveDown();
    doc
      .fontSize(10)
      .text(`Date d’émission : ${new Date().toLocaleDateString("fr-FR")}`, {
        align: "right",
      });

    doc.moveDown(2);

    const boxTop = doc.y;
    doc.rect(50, boxTop, 500, 170).stroke("#ddd");

    doc.fontSize(11).fillColor("#333");

    doc.text("Donateur :", 70, boxTop + 20);
    doc
      .font("Helvetica-Bold")
      .fillColor("#000")
      .text(
        donation.anonymous
          ? "DONATEUR ANONYME"
          : (donation.donorName || "N/A").toUpperCase(),
        180,
        boxTop + 20
      );

    doc.font("Helvetica").fillColor("#333").text("Email :", 70, boxTop + 45);
    doc.fillColor("#000").text(donation.donorEmail || "N/A", 180, boxTop + 45);

    doc.fillColor("#333").text("Téléphone :", 70, boxTop + 70);
    doc.fillColor("#000").text(donation.donorPhone || "N/A", 180, boxTop + 70);

    doc.fillColor("#333").text("Montant :", 70, boxTop + 95);
    doc
      .font("Helvetica-Bold")
      .fillColor("#1a237e")
      .fontSize(13)
      .text(`${formattedAmount} ${donation.currency || "XAF"}`, 180, boxTop + 92);

    doc.font("Helvetica").fontSize(11).fillColor("#333");
    doc.text("Référence :", 70, boxTop + 125);
    doc.fillColor("#000").text(reference, 180, boxTop + 125);

    doc.fillColor("#333").text("Mode de paiement :", 70, boxTop + 150);
    doc.fillColor("#000").text(paymentMethodLabel, 180, boxTop + 150);

    doc.moveDown(7);

    doc
      .font("Helvetica-Oblique")
      .fontSize(10)
      .fillColor("#444")
      .text(
        "La Fondation Lap Nomba certifie avoir reçu ce don pour soutenir ses actions de sensibilisation, de formation et d’intégration des jeunes vers des opportunités numériques éthiques et durables.",
        { align: "justify", lineGap: 2 }
      );

    doc.moveDown(2);

    const currentY = doc.y;
    doc.font("Helvetica").fillColor("#000").text("Le Secrétariat Général", 390, currentY);

    if (fs.existsSync(cachetPath)) {
      doc.image(cachetPath, 375, currentY + 15, { width: 120 });
    }

    doc
      .fontSize(8)
      .fillColor("#999")
      .text(
        "Document généré automatiquement par le système de gestion de la Fondation Lap Nomba.",
        50,
        780,
        { align: "center" }
      );

    doc.end();

    writeStream.on("finish", async () => {
      try {
        const pdfUrl = `/receipts/${fileName}`;

        await DonationModel.updateOne(
          { _id: donation._id },
          {
            $set: {
              receiptUrl: pdfUrl,
              receiptNumber,
            },
          }
        );

        if (donation.donorEmail) {
          await transporter.sendMail({
            from: `"Fondation Lap Nomba" <${
              process.env.SMTP_USER || "contact@lapnomba.org"
            }>`,
            to: donation.donorEmail,
            subject: `Votre reçu officiel de don - ${receiptNumber}`,
            html: `
              <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
                <p>Bonjour <strong>${donation.donorName || "Cher donateur"}</strong>,</p>

                <p>
                  Nous vous confirmons la bonne réception de votre don de
                  <strong>${formattedAmount} ${donation.currency || "XAF"}</strong>
                  effectué via <strong>${paymentMethodLabel}</strong>.
                </p>

                <p>
                  Votre contribution soutient directement les actions de la Fondation Lap Nomba
                  en faveur de la sensibilisation, de la formation et de l’intégration des jeunes
                  dans des parcours numériques éthiques.
                </p>

                <p>
                  Veuillez trouver ci-joint votre reçu officiel.
                </p>

                <p>
                  Avec toute notre gratitude,<br />
                  <strong>Fondation Lap Nomba</strong>
                </p>
              </div>
            `,
            attachments: [{ filename: fileName, path: pdfPath }],
          });
        }

        resolve(true);
      } catch (err) {
        console.error("Erreur Mailer reçu donation :", err);
        reject(err);
      }
    });

    writeStream.on("error", (err) => reject(err));
  });
}