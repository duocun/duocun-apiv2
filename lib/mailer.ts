import nodemailer from "nodemailer";
import cfg from "../config";
const transporter = nodemailer.createTransport({
  service: cfg.MAILER.SERVICE,
  auth: {
    user: cfg.MAILER.USER,
    pass: cfg.MAILER.PASSWORD
  }
});

export default transporter;
