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

export async function generateAndSendReceipt(donation: any): Promise<boolean> {
  const receiptNumber = generateReceiptNumber(donation);
  const fileName = `${receiptNumber}.pdf`;

  // process.cwd() pointe vers la racine du projet (le dossier backend/)
  const rootPath = process.cwd();
  
  // Chemin pour enregistrer le PDF dans /public/receipts à la racine
  const pdfPath = path.join(rootPath, "public", "receipts", fileName);

  // Chemins absolus vers les assets
  const logoPath = path.join(rootPath, "src", "assets", "logo.png");
  const cachetPath = path.join(rootPath, "src", "assets", "cachet.png");

  // Assurer que le dossier de destination existe
  if (!fs.existsSync(path.dirname(pdfPath))) {
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const writeStream = fs.createWriteStream(pdfPath);

    doc.pipe(writeStream);

    // --- EN-TÊTE ---
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 60 });
    } else {
      console.warn("⚠️ Logo introuvable au chemin:", logoPath);
    }

    doc.fillColor("#1a237e").fontSize(20).text("FONDATION LAP NOMBA", 120, 50);
    doc.fillColor("#444").fontSize(10).font('Helvetica-Oblique').text("« Former pour transformer »", 120, 75);
    
    doc.font('Helvetica').fillColor("#000").fontSize(9)
       .text("Quartier Essomba – Yaoundé, Cameroun", 120, 95)
       .text(`Email: contact@lapnomba.org | Site: www.lapnomba.org`, 120, 110);

    doc.moveDown(2);
    doc.rect(50, 140, 500, 2).fill("#1a237e");

    // --- INFOS DU REÇU ---
    doc.moveDown(3);
    doc.font('Helvetica-Bold').fillColor("#000").fontSize(16).text(`REÇU DE DON DE FONDS`, { align: "center", underline: true });
    doc.font('Helvetica').fontSize(11).text(`N° ${receiptNumber}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, { align: "right" });

    // --- DÉTAILS DU DON ---
    doc.moveDown(2);
    const boxTop = doc.y;
    doc.rect(50, boxTop, 500, 150).stroke("#ddd");

    doc.fontSize(11).fillColor("#333");
    doc.text(`Donateur :`, 70, boxTop + 20);
    doc.font('Helvetica-Bold').fillColor("#000").text(donation.donorName.toUpperCase(), 180, boxTop + 20);
    
    doc.font('Helvetica').fillColor("#333").text(`Email :`, 70, boxTop + 40);
    doc.fillColor("#000").text(donation.donorEmail, 180, boxTop + 40);
    
    doc.fillColor("#333").text(`Montant :`, 70, boxTop + 70);
    const formattedAmount = new Intl.NumberFormat('fr-FR').format(donation.amount);
    doc.font('Helvetica-Bold').fillColor("#1a237e").fontSize(13).text(`${formattedAmount} ${donation.currency}`, 180, boxTop + 68);
    
    doc.font('Helvetica').fontSize(11).fillColor("#333").text(`Référence :`, 70, boxTop + 100);
    doc.fillColor("#000").text(donation.bankTransfer?.reference || "N/A", 180, boxTop + 100);
    
    doc.fillColor("#333").text(`Mode de paiement :`, 70, boxTop + 120);
    doc.fillColor("#000").text("VIREMENT BANCAIRE", 180, boxTop + 120);

    // --- MENTIONS ---
    doc.moveDown(6);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor("#444").text(
      "La Fondation Lap Nomba certifie avoir reçu ce don pour soutenir ses actions d'éducation et de transformation sociale. Ce document atteste de votre contribution généreuse.",
      { align: "justify", lineGap: 2 }
    );

    // --- SIGNATURE & CACHET ---
    doc.moveDown(2);
    const currentY = doc.y;
    doc.font('Helvetica').text("Le Secrétariat Général", 400, currentY);
    
    if (fs.existsSync(cachetPath)) {
      doc.image(cachetPath, 380, currentY + 15, { width: 120 });
    } else {
      console.warn("⚠️ Cachet introuvable au chemin:", cachetPath);
    }

    doc.fontSize(8).fillColor("#999").text("Document généré automatiquement par le système de gestion de la Fondation Lap Nomba.", 50, 780, { align: "center" });

    doc.end();

    writeStream.on("finish", async () => {
      try {
        const pdfUrl = `/receipts/${fileName}`;
        await DonationModel.updateOne({ _id: donation._id }, { $set: { receiptUrl: pdfUrl, receiptNumber } });

        await transporter.sendMail({
          from: `"Fondation Lap Nomba" <${process.env.SMTP_USER}>`,
          to: donation.donorEmail,
          subject: `Merci pour votre don - Reçu n°${receiptNumber}`,
          html: `
            <p>Cher(e) <b>${donation.donorName}</b>,</p>
            <p>Nous avons bien reçu votre don de <b>${donation.amount} ${donation.currency}</b>.</p>
            <p>Votre générosité nous aide directement à réaliser notre mission : <i>"Former pour transformer"</i>.</p>
            <p>Veuillez trouver ci-joint votre reçu officiel.</p>
            <br/>
            <p>Cordialement,</p>
            <p><b>L'équipe de la Fondation Lap Nomba</b></p>
          `,
          attachments: [{ filename: fileName, path: pdfPath }],
        });
        resolve(true);
      } catch (err) {
        console.error("Erreur Mailer:", err);
        reject(err);
      }
    });

    writeStream.on("error", (err) => reject(err));
  });
}