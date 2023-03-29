import * as N3 from 'n3';
import { 
    rdfTransformStore , 
    extractGraph , 
    renameSubjectInGraph ,
    generate_uuid ,
    jsonldStrFrame , 
    type IPolicyType
} from '../../util';
import { PolicyPlugin } from '../PolicyPlugin';

export class SendNotificationPlugin extends PolicyPlugin {
    context : string[];

    constructor(context: string[]) {
        super();
        this.context = context;
    }

    public async execute(_: N3.Store, policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {
        // console.log('***Policy***');
        // console.log(JSON.stringify(policy,null,4));

        // Read the arguments from the policy
        const to           = policy.args['http://example.org/to'];
        const notification = policy.args['http://example.org/notification'];

        if (! to) {
            console.error('no http://example.org/to in policy');
            return false;
        }

        if (! notification) {
            console.error('no http://example.org/notification in policy');
            return false;
        }

        // Extract the sub graph containing the notifiction body
        const notificationStore = extractGraph(policyStore,notification);

        if (notificationStore.size) {
            // We are ok
        }
        else {
            console.error(`searching for http://example.org/notification ${notification.value} resulted in an empty graph`);
            return false;
        }

        // Create a new UUID for the notfication
        const uuid = generate_uuid();

        // Create a new graph with using the uuid()
        const newNotificationStore = renameSubjectInGraph(notificationStore, notification, uuid);

        // Transform into JSON-LD and frame it
        const notificationRdf = await rdfTransformStore(newNotificationStore,'application/ld+json');
        const json = await jsonldStrFrame(
                notificationRdf
                , { 
                    "@context": this.context,
                    "@id": uuid.value
                }
        );

        console.log(`Sending to ${to.value} a ${json['type']}`);
        console.log(JSON.stringify(json, null, 2));

        const result = await fetch(to.value, {
                method: 'POST', 
                body: JSON.stringify(json) 
            });

        if (result.ok) {
            return true;
        }
        else {
            console.error(`${to.value} failed with: ${result.status} - ${result.statusText}`);
            return false;
        }
    }
}