import {gatewayJson} from '../../helpers/gatewayResponse';
export async function handle(){return gatewayJson({error:'Use your approved company Microsoft account to sign in.'},403);}
