import * as N3 from 'n3';
import { type IPolicyType} from '../util';

// Send a notification via https://github.com/binwiederhier/ntfy
export async function policyTarget(_1: N3.Store, _2: N3.Store, policy: IPolicyType) : Promise<boolean> {

    return new Promise<boolean>( async (resolve, reject) => { 
        const topic = process.env.NTFY_TOPIC || policy.config['topic'];

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