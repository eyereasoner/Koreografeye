import * as N3 from 'n3';
import * as nodemailer from 'nodemailer';
import { type IPolicyType} from '../../util';
import { PolicyPlugin } from '../PolicyPlugin';

export class SendEmailPlugin extends PolicyPlugin {
    host: string;
    port: number;
    secure: boolean;

    constructor(host: string, port: number, secure: boolean) {
        super();
        this.host = host;
        this.port = port;
        this.secure = secure;
    }

    public async execute(_1: N3.Store, _2: N3.Store, policy: IPolicyType) : Promise<boolean> {
        const transportParam : any = {
            host: this.host ,
            port: this.port ,
            secure: this.secure
        }

        if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
            transportParam['auth']['user'] = process.env.EMAIL_USERNAME;
            transportParam['auth']['pass'] = process.env.EMAIL_PASSWORD;
        }
    
        const transport = nodemailer.createTransport(transportParam);

        return new Promise<boolean>( (resolve, reject) => { 
            const to      = policy.args['http://example.org/to']?.value;
            const from    = policy.args['http://example.org/from']?.value;
            const subject = policy.args['http://example.org/subject']?.value;
            const body    = policy.args['http://example.org/body']?.value;

            if (to && from && subject && body) {
                console.log(`Sending to (${to}), from (${from}) with subject (${subject})`);
            }
            else {
                console.error('Need a to, from, subject and body');
                return reject(false);
            }

            const mailOptions = {
                from: from,
                to: to,
                subject: subject,
                text: body
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
}