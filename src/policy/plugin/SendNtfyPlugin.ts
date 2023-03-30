import * as N3 from 'n3';
import { PolicyPlugin , type IPolicyType } from '../PolicyPlugin';

export class SendNtfyPlugin extends PolicyPlugin {
    topic : string;

    constructor(topic: string) {
        super();
        this.topic = topic
    }

    // Send a notification via https://github.com/binwiederhier/ntfy
    public async execute(_1: N3.Store, _2: N3.Store, policy: IPolicyType) : Promise<boolean> {

        return new Promise<boolean>( async (resolve, reject) => { 
            const topic = process.env.NTFY_TOPIC || this.topic;

            if (!topic) {
                console.error(`No NTFY_TOPIC set in environment`);
                return reject(false);
            }

            const message = policy.args['http://example.org/message']?.value;

            if (message) {
                console.log(`Sending to (${topic}) : ${message}`);
            }
            else {
                console.error('Need a to message');
                return reject(false);
            }

            const result = await fetch(`https://ntfy.sh/${topic}`, {
                method: 'POST', // PUT works too
                body: message
            });

            if (result.ok) {
                return resolve(true);
            }
            else {
                console.error(`ntfy.sh failed with: ${result.text}`);
                return reject(false);
            }
        });
    }
}