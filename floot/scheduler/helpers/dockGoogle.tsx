import {AppError} from './dockErrors';
export async function geocodeAddress(){throw new AppError('Address geocoding is not connected in staging. Existing map locations are retained.',503);}
