require('dotenv').config();
const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const from = process.env.SMTP_FROM;

console.log('====================================================');
console.log('📧 ZENPOS SMTP CONNECTION TEST SCRIPT');
console.log('====================================================');
console.log('SMTP_HOST:', host);
console.log('SMTP_PORT:', port);
console.log('SMTP_USER:', user);
console.log('SMTP_FROM:', from);
console.log('====================================================\n');

if (!host || !port || !user || !pass) {
  console.error('❌ Error: Missing SMTP configurations in your .env file!');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port: parseInt(port),
  secure: parseInt(port) === 465, // true for 465, false for 587
  auth: { user, pass },
  tls: {
    rejectUnauthorized: false // Bypasses self-signed or intermediate certificate verification issues
  }
});

console.log('Connecting to SMTP server and verifying credentials...');

transporter.verify((error, success) => {
  if (error) {
    console.error('\n❌ SMTP Connection Verification Failed!');
    console.error('Error Details:', error);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Double check your password in the .env file.');
    console.log('2. Ensure your VPS firewall or hosting provider allows outbound connections on port', port);
    console.log('3. Try toggling ports: Hostinger supports port 465 (secure: true) and port 587 (secure: false).');
  } else {
    console.log('\n✅ SMTP Server is ready to take messages!');
    
const mailOptions = {
  from: from || user,
  to: 'sajidhasan72885@gmail.com', // 👈 Put your Gmail or another email here
  subject: 'ZenPos SMTP Test Mail',
  text: '...'
};
    
    console.log(`Sending a test email to ${user}...`);
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('\n❌ Test Mail Send Failed!');
        console.error('Error Details:', err);
      } else {
        console.log('\n🎉 Test Mail Sent Successfully!');
        console.log('Server Response:', info.response);
      }
    });
  }
});
