import * as N3 from 'n3';
import { type IPolicyType} from '../util';

// Send a notification via https://github.com/binwiederhier/ntfy
export async function policyTarget(_1: N3.Store, _2: N3.Store, policy: IPolicyType) : Promise<boolean> {
    const topic = process.env.NTFY_TOPIC ;

    return new Promise<boolean>( (resolve, reject) => { 
        if (!topic) {
            console.error(`No NTFY_TOPIC set in environment`);
            reject(false);
        }
        const message = policy.args['http://example.org/message']?.value;

        if (message) {
            console.log(`Sending to (${topic}) : ${message}`);
        }
        else {
            console.error('Need a to message');
            reject(false);
        }

        fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST', // PUT works too
            body: message
        });

        resolve(true);
    });
}