import * as N3 from 'n3';
import { 
    rdfTransformStore , 
    extractGraph , 
    renameSubjectInGraph ,
    generate_uuid ,
    jsonldStrFrame 
} from '../../util';
import { PolicyPlugin , type IPolicyType } from '../PolicyPlugin';

export class SendNotificationPlugin extends PolicyPlugin {
    context : string[] = [];
    context_cache : string | null = null;

    constructor(context: string[], context_cache?: string) {
        super();

        if (context) {
            this.context = context;
        }
            
        if (context_cache) {
            this.context_cache = context_cache;
        }
    }

    public async execute(_: N3.Store, policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {
        // console.log('***Policy***');
        // console.log(JSON.stringify(policy,null,4));

        // Read the arguments from the policy
        const to           = policy.args['http://example.org/to'];
        const notification = policy.args['http://example.org/notification'];

        if (to.length == 0) {
            this.logger.error('no http://example.org/to in policy');
            return false;
        }

        if (notification.length == 0) {
            this.logger.error('no http://example.org/notification in policy');
            return false;
        }

        const thisTo = to[0];
        const thisNotification = notification[0];

        // Extract the sub graph containing the notifiction body
        const notificationStore = extractGraph(policyStore,thisNotification);

        if (notificationStore.size) {
            // We are ok
        }
        else {
            this.logger.error(`searching for http://example.org/notification ${thisNotification.value} resulted in an empty graph`);
            return false;
        }

        // Create a new UUID for the notfication
        const uuid = generate_uuid();

        // Create a new graph with using the uuid()
        const newNotificationStore = renameSubjectInGraph(notificationStore, thisNotification, uuid);

        // Transform into JSON-LD and frame it
        const notificationRdf = await rdfTransformStore(newNotificationStore,'application/ld+json');
        const json = await jsonldStrFrame(
                notificationRdf
                , { 
                    "@context": this.context,
                    "@id": uuid.value
                }
                , this.context_cache
        );

        this.logger.info(`Sending to ${thisTo.value} a ${json['type']}`);
        this.logger.debug(JSON.stringify(json, null, 2));

        const result = await fetch(thisTo.value, {
                method: 'POST', 
                body: JSON.stringify(json) ,
                headers: {
                    "Content-type" : "application/ld+json; charset=UTF-8"
                }
            });

        if (result.ok) {
            return true;
        }
        else {
            this.logger.error(`${thisTo.value} failed with: ${result.status} - ${result.statusText}`);
            return false;
        }
    }
}