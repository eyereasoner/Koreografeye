import * as N3 from 'n3';
import * as nodemailer from 'nodemailer';
import { type IPolicyType} from '../util';

const transport = nodemailer.createTransport({
    host: 'mail.gmx.net',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
});
  
export async function policyTarget(_1: N3.Store, _2: N3.Store, policy: IPolicyType) : Promise<boolean> {
    
    return new Promise<boolean>( (resolve, reject) => { 
        const to      = policy.args['http://example.org/to']?.value;
        const from    = policy.args['http://example.org/from']?.value;
        const subject = policy.args['http://example.org/subject']?.value;

        if (to && from && subject) {
            console.log(`Sending to (${to}), from (${from}) with subject (${subject})`);
        }
        else {
            console.error('Need a to from and subject');
            reject(false);
        }

        const mailOptions = {
            from: from,
            to: to,
            subject: subject,
            text: 'Hello People!, Welcome to Bacancy!', 
        };

        transport.sendMail(mailOptions, (err: any, info: any) => {
              if (err) {
                console.log(err);
                reject(false);
              } else {
                console.log(info);
                resolve(true);
              }
        });
    });
}